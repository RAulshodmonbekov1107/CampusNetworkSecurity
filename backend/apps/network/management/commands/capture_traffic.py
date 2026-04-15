"""
Real network traffic capture using scapy.

Sniffs live packets from the host network interface, aggregates them into
connection flows, detects suspicious patterns, and feeds everything into
Elasticsearch, Kafka, and the Django ORM — providing real data for the
Campus Network Security dashboard.

Must run with CAP_NET_RAW (root or Docker with --cap-add NET_RAW).

Usage:
    python manage.py capture_traffic
    python manage.py capture_traffic --iface wlo1
    python manage.py capture_traffic --iface enp3s0 --flush-interval 10
"""
import json
import time
import signal
import logging
import threading
from collections import defaultdict
from datetime import datetime

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.network.models import NetworkTraffic
from apps.alerts.models import SecurityAlert


def _delivery_report(err, msg):
    """Kafka delivery callback — log failures so they are visible."""
    if err is not None:
        logging.getLogger(__name__).warning("Kafka delivery failed: %s", err)


def _push_live(data: dict):
    """Push a live event to the network_live WebSocket group.

    Uses ``async_to_sync`` from asgiref (consistent with the rest of the
    codebase) and Django Channels' ``get_channel_layer`` singleton instead of
    manually constructing a Redis channel layer.
    """
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync

        layer = get_channel_layer()
        if layer is None:
            return
        async_to_sync(layer.group_send)(
            "network_live", {"type": "network_event", "data": data}
        )
    except Exception:
        pass

logger = logging.getLogger(__name__)

CAMPUS_SUBNET = "192.168."
WELL_KNOWN_PORTS = {
    20: "FTP", 21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP",
    53: "DNS", 67: "DHCP", 68: "DHCP", 80: "HTTP", 110: "POP3",
    123: "NTP", 143: "IMAP", 443: "HTTPS", 445: "SMB", 465: "SMTPS",
    587: "SMTP", 993: "IMAPS", 995: "POP3S", 1433: "MSSQL",
    1521: "Oracle", 3306: "MySQL", 3389: "RDP", 5432: "PostgreSQL",
    5900: "VNC", 6379: "Redis", 8080: "HTTP-Alt", 8443: "HTTPS-Alt",
    9200: "Elasticsearch", 9092: "Kafka",
}

PROTO_MAP = {1: "ICMP", 6: "TCP", 17: "UDP"}

PORT_SCAN_THRESHOLD = 15
BRUTE_FORCE_THRESHOLD = 8
HIGH_VOLUME_BYTES = 50_000_000
DNS_TUNNEL_LEN = 100


class FlowKey:
    __slots__ = ("src", "dst", "sport", "dport", "proto")

    def __init__(self, src, dst, sport, dport, proto):
        self.src = src
        self.dst = dst
        self.sport = sport
        self.dport = dport
        self.proto = proto

    def __hash__(self):
        return hash((self.src, self.dst, self.sport, self.dport, self.proto))

    def __eq__(self, other):
        return (self.src == other.src and self.dst == other.dst and
                self.sport == other.sport and self.dport == other.dport and
                self.proto == other.proto)


class Flow:
    __slots__ = (
        "src", "dst", "sport", "dport", "proto",
        "bytes_sent", "bytes_recv", "pkts_sent", "pkts_recv",
        "first_seen", "last_seen", "flags",
    )

    def __init__(self, src, dst, sport, dport, proto, ts):
        self.src = src
        self.dst = dst
        self.sport = sport
        self.dport = dport
        self.proto = proto
        self.bytes_sent = 0
        self.bytes_recv = 0
        self.pkts_sent = 0
        self.pkts_recv = 0
        self.first_seen = ts
        self.last_seen = ts
        self.flags = set()


class Command(BaseCommand):
    help = "Capture real network traffic from the host interface"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._running = True
        self._flows = {}
        self._flow_lock = threading.Lock()
        self._local_ip = None
        # Anomaly detection state — sliding window (never cleared automatically)
        self._anomaly_lock = threading.Lock()
        self._port_tracker = defaultdict(set)   # src_ip -> set of dst_ports
        self._conn_tracker = defaultdict(int)   # (src_ip, dst_port) -> count
        self._vol_tracker = defaultdict(int)    # src_ip -> total bytes
        self._dns_tracker = defaultdict(int)    # src_ip -> oversized DNS count
        self._alerted_ips = {}                  # src_ip -> timestamp of last alert (cooldown)

    def add_arguments(self, parser):
        parser.add_argument("--iface", type=str, default="wlo1",
                            help="Network interface to capture on")
        parser.add_argument("--flush-interval", type=int, default=8,
                            help="Seconds between flow flushes")
        parser.add_argument("--bpf", type=str, default="",
                            help="Optional BPF filter (e.g. 'not port 9200')")

    def handle(self, *args, **options):
        iface = options["iface"]
        flush_interval = options["flush_interval"]
        bpf = options["bpf"]

        self._detect_local_ip(iface)
        es = self._connect_es()
        producer = self._connect_kafka()

        signal.signal(signal.SIGINT, lambda *_: self._stop())
        signal.signal(signal.SIGTERM, lambda *_: self._stop())

        # Exclude our own infra traffic by default
        if not bpf:
            bpf = "not (port 9200 or port 9092 or port 29092 or port 6379 or port 5601 or port 9600)"

        self.stdout.write(self.style.SUCCESS(
            f"Capturing real traffic on {iface} (local IP: {self._local_ip})\n"
            f"  BPF filter: {bpf or 'none'}\n"
            f"  Flush interval: {flush_interval}s"
        ))

        flush_thread = threading.Thread(
            target=self._flush_loop, args=(flush_interval, es, producer), daemon=True
        )
        flush_thread.start()

        try:
            from scapy.all import sniff as scapy_sniff
            scapy_sniff(
                iface=iface,
                prn=self._process_packet,
                filter=bpf,
                store=False,
                stop_filter=lambda _: not self._running,
            )
        except PermissionError:
            self.stderr.write(self.style.ERROR(
                "Permission denied. Run with CAP_NET_RAW or as root."
            ))
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f"Capture error: {exc}"))
        finally:
            self._flush_flows(es, producer)
            if producer:
                producer.flush(5)
            self.stdout.write(self.style.SUCCESS("Capture stopped."))

    def _stop(self):
        self._running = False

    def _detect_local_ip(self, iface):
        try:
            from scapy.all import get_if_addr
            self._local_ip = get_if_addr(iface)
            if not self._local_ip or self._local_ip == "0.0.0.0":
                self._local_ip = "192.168.2.223"
        except Exception:
            self._local_ip = "192.168.2.223"

    # -- Packet Processing ---------------------------------------------------

    def _process_packet(self, pkt):
        try:
            from scapy.all import IP, TCP, UDP, ICMP, DNS, Raw
        except ImportError:
            return

        if not pkt.haslayer(IP):
            return

        ip = pkt[IP]
        src = ip.src
        dst = ip.dst
        proto_num = ip.proto
        proto = PROTO_MAP.get(proto_num, str(proto_num))
        sport = dport = 0
        pkt_len = len(pkt)
        flags = set()

        if pkt.haslayer(TCP):
            tcp = pkt[TCP]
            sport = tcp.sport
            dport = tcp.dport
            if tcp.flags:
                flags = {f for f in str(tcp.flags)}
        elif pkt.haslayer(UDP):
            udp = pkt[UDP]
            sport = udp.sport
            dport = udp.dport

        app_proto = self._classify_protocol(sport, dport, proto, pkt)

        is_outbound = (src == self._local_ip) or src.startswith(CAMPUS_SUBNET)

        key = FlowKey(src, dst, sport, dport, proto)

        with self._flow_lock:
            now = time.time()
            if key not in self._flows:
                self._flows[key] = Flow(src, dst, sport, dport, app_proto, now)
            flow = self._flows[key]
            flow.last_seen = now
            flow.flags.update(flags)

            if is_outbound:
                flow.bytes_sent += pkt_len
                flow.pkts_sent += 1
            else:
                flow.bytes_recv += pkt_len
                flow.pkts_recv += 1

        self._update_anomaly_trackers(src, dst, dport, pkt_len, pkt)

    def _classify_protocol(self, sport, dport, transport, pkt):
        for port in (dport, sport):
            if port in WELL_KNOWN_PORTS:
                return WELL_KNOWN_PORTS[port]

        if transport == "UDP" and (sport == 53 or dport == 53):
            return "DNS"
        if transport == "TCP":
            if dport in (80, 8080, 8000, 3000):
                return "HTTP"
            if dport in (443, 8443):
                return "HTTPS"
        return transport

    # -- Anomaly Detection ---------------------------------------------------

    def _update_anomaly_trackers(self, src, dst, dport, pkt_len, pkt):
        from scapy.all import DNS

        with self._anomaly_lock:
            self._port_tracker[src].add(dport)
            self._conn_tracker[(src, dport)] += 1
            self._vol_tracker[src] += pkt_len

            if pkt.haslayer(DNS):
                dns = pkt[DNS]
                if dns.qr == 0 and dns.qd:
                    qname = dns.qd.qname.decode("utf-8", errors="ignore") if dns.qd.qname else ""
                    if len(qname) > DNS_TUNNEL_LEN:
                        self._dns_tracker[src] += 1

    def _in_cooldown(self, key, cooldown_secs=60):
        """Prevent duplicate alerts for the same IP within cooldown_secs."""
        now = time.time()
        last = self._alerted_ips.get(key, 0)
        if now - last < cooldown_secs:
            return True
        self._alerted_ips[key] = now
        return False

    def _detect_anomalies(self, es, producer):
        with self._anomaly_lock:
            port_snapshot = {k: set(v) for k, v in self._port_tracker.items()}
            conn_snapshot = dict(self._conn_tracker)
            vol_snapshot = dict(self._vol_tracker)
            dns_snapshot = dict(self._dns_tracker)

        alerts = []

        for src, ports in port_snapshot.items():
            if len(ports) >= PORT_SCAN_THRESHOLD:
                if not self._in_cooldown(f"scan:{src}"):
                    alerts.append(self._make_alert(
                        src=src,
                        title=f"Port Scan Detected — {len(ports)} ports from {src}",
                        category="port_scan",
                        severity="high",
                        description=f"Host {src} probed {len(ports)} unique destination ports",
                        ports=sorted(list(ports))[:20],
                    ))
                with self._anomaly_lock:
                    self._port_tracker[src].clear()

        for (src, dport), count in conn_snapshot.items():
            if dport in (22, 3389, 23, 21, 445) and count >= BRUTE_FORCE_THRESHOLD:
                if not self._in_cooldown(f"brute:{src}:{dport}"):
                    svc = WELL_KNOWN_PORTS.get(dport, str(dport))
                    alerts.append(self._make_alert(
                        src=src,
                        title=f"Brute Force Attempt — {count} connections to {svc}",
                        category="brute_force",
                        severity="critical",
                        description=f"Host {src} made {count} connections to port {dport} ({svc})",
                    ))
                with self._anomaly_lock:
                    self._conn_tracker[(src, dport)] = 0

        for src, total in vol_snapshot.items():
            if total >= HIGH_VOLUME_BYTES:
                if not self._in_cooldown(f"vol:{src}"):
                    mb = total / 1_000_000
                    alerts.append(self._make_alert(
                        src=src,
                        title=f"High Traffic Volume — {mb:.1f} MB from {src}",
                        category="data_exfiltration" if not src.startswith(CAMPUS_SUBNET) else "suspicious_traffic",
                        severity="high",
                        description=f"Host {src} transferred {mb:.1f} MB in the monitoring window",
                    ))
                with self._anomaly_lock:
                    self._vol_tracker[src] = 0

        for src, count in dns_snapshot.items():
            if count >= 3:
                if not self._in_cooldown(f"dns:{src}"):
                    alerts.append(self._make_alert(
                        src=src,
                        title=f"DNS Tunneling Suspected — {count} oversized queries from {src}",
                        category="suspicious_traffic",
                        severity="critical",
                        description=f"Host {src} sent {count} DNS queries longer than {DNS_TUNNEL_LEN} bytes",
                    ))
                with self._anomaly_lock:
                    self._dns_tracker[src] = 0

        for alert in alerts:
            self._push_alert(alert, es, producer)

        # Every 30 cycles (~4 min) do a full clear to prevent unbounded memory growth
        self._anomaly_cycle = getattr(self, "_anomaly_cycle", 0) + 1
        if self._anomaly_cycle >= 30:
            self._anomaly_cycle = 0
            with self._anomaly_lock:
                self._port_tracker.clear()
                self._conn_tracker.clear()
                self._vol_tracker.clear()
                self._dns_tracker.clear()
            now = time.time()
            self._alerted_ips = {k: v for k, v in self._alerted_ips.items() if now - v < 120}

    def _make_alert(self, src, title, category, severity, description, ports=None):
        return {
            "@timestamp": datetime.utcnow().isoformat() + "Z",
            "event_type": "alert",
            "source_ip": src,
            "destination_ip": self._local_ip,
            "proto": "TCP",
            "alert": {
                "signature": title,
                "signature_id": hash(title) % 9000000 + 1000000,
                "severity": {"critical": 1, "high": 2, "medium": 3}.get(severity, 3),
                "category": category,
            },
        }

    # -- Flush Loop ----------------------------------------------------------

    def _flush_loop(self, interval, es, producer):
        while self._running:
            time.sleep(interval)
            try:
                self._flush_flows(es, producer)
            except Exception as exc:
                logger.error("Flush error: %s", exc)
            try:
                self._detect_anomalies(es, producer)
            except Exception as exc:
                logger.error("Detection error: %s", exc)

    def _flush_flows(self, es, producer):
        with self._flow_lock:
            flows = list(self._flows.values())
            self._flows.clear()

        if not flows:
            return

        now_str = datetime.utcnow().isoformat() + "Z"
        idx_date = datetime.utcnow().strftime("%Y.%m.%d")
        es_index = f"network-flows-{idx_date}"

        es_actions = []
        kafka_payloads = []
        orm_objects = []

        for flow in flows:
            duration = max(flow.last_seen - flow.first_seen, 0.001)

            is_internal_src = flow.src.startswith(CAMPUS_SUBNET)
            is_internal_dst = flow.dst.startswith(CAMPUS_SUBNET)

            if is_internal_src and not is_internal_dst:
                direction = "outbound"
            elif not is_internal_src and is_internal_dst:
                direction = "inbound"
            else:
                direction = "internal"

            conn_state = "ESTABLISHED"
            if "S" in flow.flags and "A" not in flow.flags:
                conn_state = "SYN_SENT"
            elif "F" in flow.flags:
                conn_state = "FIN_WAIT"
            elif "R" in flow.flags:
                conn_state = "CLOSE"

            es_doc = {
                "@timestamp": now_str,
                "source_ip": flow.src,
                "destination_ip": flow.dst,
                "source_port": flow.sport,
                "destination_port": flow.dport,
                "proto": flow.proto,
                "orig_bytes": flow.bytes_sent,
                "resp_bytes": flow.bytes_recv,
                "bytes": flow.bytes_sent + flow.bytes_recv,
                "packets_sent": flow.pkts_sent,
                "packets_received": flow.pkts_recv,
                "conn_state": conn_state,
                "duration": round(duration, 3),
                "direction": direction,
            }

            es_actions.append({"_index": es_index, "_source": es_doc})
            kafka_payloads.append(json.dumps(es_doc).encode())

            orm_objects.append(NetworkTraffic(
                timestamp=timezone.now(),
                source_ip=flow.src,
                destination_ip=flow.dst,
                source_port=flow.sport,
                destination_port=flow.dport,
                protocol=self._map_to_model_proto(flow.proto),
                bytes_sent=flow.bytes_sent,
                bytes_received=flow.bytes_recv,
                packets_sent=flow.pkts_sent,
                packets_received=flow.pkts_recv,
                connection_state=conn_state,
                duration=round(duration, 3),
                application=flow.proto if flow.proto not in PROTO_MAP.values() else None,
            ))

        if es and es_actions:
            try:
                from elasticsearch.helpers import bulk
                bulk(es, es_actions, raise_on_error=False)
            except Exception as exc:
                logger.debug("ES bulk index error: %s", exc)

        if producer and kafka_payloads:
            for payload in kafka_payloads:
                try:
                    producer.produce(
                        "network_flows", payload, callback=_delivery_report
                    )
                except Exception as exc:
                    logger.debug("Kafka produce error: %s", exc)
            producer.flush()

        try:
            NetworkTraffic.objects.bulk_create(orm_objects, ignore_conflicts=True)
        except Exception as exc:
            logger.debug("ORM bulk_create error: %s", exc)

        # --- Push live snapshot to WebSocket dashboard ---
        try:
            # Aggregate per-device stats from this flush batch
            device_map: dict = {}
            proto_map_batch: dict = {}
            total_bytes_batch = 0
            flow_events = []

            for flow in flows:
                total_bytes_batch += flow.bytes_sent + flow.bytes_recv

                # Track unique campus devices
                for ip in (flow.src, flow.dst):
                    if ip.startswith(CAMPUS_SUBNET):
                        if ip not in device_map:
                            device_map[ip] = {"ip": ip, "flows": 0, "bytes": 0, "proto": flow.proto}
                        device_map[ip]["flows"] += 1
                        device_map[ip]["bytes"] += flow.bytes_sent + flow.bytes_recv

                # Protocol distribution in this batch
                p = flow.proto
                proto_map_batch[p] = proto_map_batch.get(p, 0) + flow.bytes_sent + flow.bytes_recv

                # Individual flow event (only meaningful ones, skip tiny broadcasts)
                if flow.bytes_sent + flow.bytes_recv > 200:
                    flow_events.append({
                        "src": flow.src,
                        "dst": flow.dst,
                        "proto": flow.proto,
                        "bytes": flow.bytes_sent + flow.bytes_recv,
                        "sport": flow.sport,
                        "dport": flow.dport,
                        "dir": "out" if flow.src.startswith(CAMPUS_SUBNET) and not flow.dst.startswith(CAMPUS_SUBNET) else
                               "in" if flow.dst.startswith(CAMPUS_SUBNET) and not flow.src.startswith(CAMPUS_SUBNET) else "int",
                    })

            _push_live({
                "type": "stats_update",
                "ts": datetime.utcnow().isoformat() + "Z",
                "flush_flows": len(flows),
                "flush_bytes": total_bytes_batch,
                "devices": list(device_map.values()),
                "protocols": [{"proto": k, "bytes": v} for k, v in proto_map_batch.items()],
                "flows": flow_events[:30],  # cap at 30 per flush
            })
        except Exception:
            pass

        self.stdout.write(f"  Flushed {len(flows)} flows")

    def _map_to_model_proto(self, proto):
        proto_upper = proto.upper()
        valid = {"TCP", "UDP", "ICMP", "HTTP", "HTTPS", "FTP", "SSH", "DNS", "DHCP"}
        return proto_upper if proto_upper in valid else "TCP"

    # -- Alert Push ----------------------------------------------------------

    def _push_alert(self, event, es, producer):
        idx_date = datetime.utcnow().strftime("%Y.%m.%d")
        if es:
            try:
                es.index(index=f"security-alerts-{idx_date}", document=event)
            except Exception:
                pass

        if producer:
            try:
                producer.produce("security_alerts", json.dumps(event).encode())
            except Exception:
                pass

        alert_info = event.get("alert", {})
        severity_map = {1: "critical", 2: "high", 3: "medium"}
        CATEGORY_MAP = {
            "port_scan": "port_scan",
            "brute_force": "brute_force",
            "data_exfiltration": "data_exfiltration",
            "suspicious_traffic": "suspicious_traffic",
        }
        src_ip = event.get("source_ip", "0.0.0.0")
        category = alert_info.get("category", "")
        severity_str = severity_map.get(alert_info.get("severity"), "medium")

        try:
            SecurityAlert.objects.create(
                title=alert_info.get("signature", "Alert"),
                description=category or "N/A",
                severity=severity_str,
                alert_type=CATEGORY_MAP.get(category, "suspicious_traffic"),
                status="new",
                source_ip=src_ip,
                destination_ip=event.get("destination_ip"),
                protocol="TCP",
                signature=alert_info.get("signature"),
                rule_id=str(alert_info.get("signature_id", "")),
                timestamp=timezone.now(),
            )
        except Exception as exc:
            logger.debug("ORM alert error: %s", exc)

        # Upsert a ThreatIntelligence record so the Threat Intel page shows real data
        THREAT_MAP = {
            "port_scan": "exploit",
            "brute_force": "exploit",
            "data_exfiltration": "botnet",
            "suspicious_traffic": "c2",
        }
        SCORE_MAP = {
            "port_scan": 60,
            "brute_force": 75,
            "data_exfiltration": 70,
            "suspicious_traffic": 55,
        }
        threat_type = THREAT_MAP.get(category, "exploit")
        base_score = SCORE_MAP.get(category, 55)
        try:
            from apps.threats.models import ThreatIntelligence
            existing = ThreatIntelligence.objects.filter(ioc_type="ip", ioc_value=src_ip).first()
            if existing:
                existing.reputation_score = min(100, existing.reputation_score + 8)
                existing.last_seen = timezone.now()
                existing.save(update_fields=["reputation_score", "last_seen", "updated_at"])
            else:
                ThreatIntelligence.objects.create(
                    ioc_type="ip",
                    ioc_value=src_ip,
                    threat_type=threat_type,
                    description=alert_info.get("signature", "Detected by campus IDS"),
                    reputation_score=base_score,
                    source="Campus IDS",
                    first_seen=timezone.now(),
                    last_seen=timezone.now(),
                    tags=[category],
                )
        except Exception as exc:
            logger.debug("ThreatIntel upsert error: %s", exc)

        self.stdout.write(self.style.WARNING(
            f"  ALERT: {alert_info.get('signature', '?')}"
        ))

        # Push alert live to dashboard WebSocket
        _push_live({
            "type": "alert",
            "ts": event.get("@timestamp"),
            "severity": severity_map.get(alert_info.get("severity"), "medium"),
            "title": alert_info.get("signature", "Alert"),
            "source_ip": event.get("source_ip"),
            "destination_ip": event.get("destination_ip"),
            "category": alert_info.get("category"),
        })

    # -- Connections ---------------------------------------------------------

    def _connect_es(self):
        from apps.system.elasticsearch_client import get_es_client
        for attempt in range(6):
            try:
                es = get_es_client()
                if es.ping():
                    self.stdout.write(self.style.SUCCESS("ES connected (shared client)"))
                    return es
                self.stdout.write(self.style.WARNING(
                    f"ES ping failed, retry {attempt+1}/6..."
                ))
            except Exception as exc:
                self.stdout.write(self.style.WARNING(
                    f"ES connection attempt {attempt+1}/6 failed: {exc}"
                ))
            time.sleep(5)
        self.stdout.write(self.style.WARNING("ES unavailable after retries, continuing without ES"))
        return None

    def _connect_kafka(self):
        try:
            from confluent_kafka import Producer
            from decouple import config
            bootstrap = config("KAFKA_BOOTSTRAP_SERVERS", default="localhost:9092")
            p = Producer({"bootstrap.servers": bootstrap})
            self.stdout.write(self.style.SUCCESS(f"Kafka connected: {bootstrap}"))
            return p
        except Exception as exc:
            self.stdout.write(self.style.WARNING(f"Kafka unavailable: {exc}"))
        return None
