"""
Unified data simulator that mimics the full Zeek+Suricata pipeline.

Feeds data simultaneously to:
  - Elasticsearch (network-flows-* and security-alerts-* indices)
  - Kafka topics (network_flows, security_alerts)
  - Django ORM (NetworkTraffic, SecurityAlert models)

Usage:
    python manage.py simulate_pipeline
    python manage.py simulate_pipeline --rate 5
    python manage.py simulate_pipeline --rate 3 --duration 60
"""
import json
import time
import random
import logging
from datetime import datetime

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.network.models import NetworkTraffic
from apps.alerts.models import SecurityAlert

logger = logging.getLogger(__name__)

INTERNAL_SUBNETS = [f"192.168.1.{i}" for i in range(1, 255)] + [f"10.0.0.{i}" for i in range(1, 100)]
EXTERNAL_IPS = [
    "8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1", "208.67.222.222",
    "142.250.191.14", "13.107.42.14", "151.101.1.140", "104.16.132.229",
    "185.199.108.153", "52.84.150.11", "93.184.216.34", "198.51.100.1",
]
MALICIOUS_IPS = [
    "45.33.32.156", "198.51.100.99", "203.0.113.42", "185.220.101.15",
    "91.219.237.229", "64.62.197.11", "176.10.99.200", "171.25.193.9",
]
PROTOCOLS = ["TCP", "UDP", "HTTP", "HTTPS", "SSH", "DNS", "ICMP", "FTP", "SMTP", "SSL"]
PORT_MAP = {"HTTP": 80, "HTTPS": 443, "SSH": 22, "DNS": 53, "FTP": 21, "SMTP": 25, "SSL": 443}
SERVICES = ["Chrome", "Firefox", "SSH", "MySQL", "PostgreSQL", "Apache", "Nginx", "curl", "Docker"]
COUNTRIES = ["US", "RU", "CN", "DE", "GB", "FR", "KR", "JP", "BR", "IN"]

ALERT_SIGNATURES = [
    ("ET SCAN Nmap SYN Scan", "Attempted Information Leak", 2),
    ("ET POLICY SSH Connection", "Potentially Bad Traffic", 3),
    ("ET MALWARE Zeus Bot Traffic Detected", "A Network Trojan was Detected", 1),
    ("ET SCAN Potential SSH Brute Force", "Attempted Administrator Privilege Gain", 1),
    ("ET DNS Query for .onion Domain", "Potentially Bad Traffic", 2),
    ("ET POLICY Outbound DNS Tunneling Detected", "Attempted Information Leak", 1),
    ("ET EXPLOIT Apache Struts RCE", "Web Application Attack", 1),
    ("ET TROJAN CnC Beacon Activity", "A Network Trojan was Detected", 1),
    ("ET POLICY Tor Exit Node Traffic", "Potentially Bad Traffic", 2),
    ("ET SCAN Aggressive Port Scan", "Attempted Information Leak", 2),
    ("ET MALWARE Ransomware Checkin", "A Network Trojan was Detected", 1),
    ("ET DOS Possible SYN Flood", "Attempted Denial of Service", 1),
    ("GPL ATTACK_RESPONSE id check returned root", "Potentially Bad Traffic", 2),
    ("ET POLICY Cryptocurrency Mining Pool", "Misc activity", 3),
    ("ET WEB_SERVER SQL Injection Attempt", "Web Application Attack", 1),
]


def _severity_label(numeric: int) -> str:
    return {1: "critical", 2: "high", 3: "medium"}.get(numeric, "low")


class Command(BaseCommand):
    help = "Simulate the full Zeek+Suricata pipeline into ES, Kafka, and Django ORM"

    def add_arguments(self, parser):
        parser.add_argument("--rate", type=float, default=3.0, help="Network flow events per second")
        parser.add_argument("--alert-ratio", type=float, default=0.08, help="Fraction of events that are alerts")
        parser.add_argument("--duration", type=int, default=0, help="Minutes to run (0=forever)")

    def handle(self, *args, **options):
        rate = options["rate"]
        alert_ratio = options["alert_ratio"]
        duration = options["duration"]

        es = self._connect_es()
        producer = self._connect_kafka()

        interval = 1.0 / max(rate, 0.1)
        end_time = time.time() + duration * 60 if duration > 0 else None
        flow_count = alert_count = 0

        self.stdout.write(self.style.SUCCESS(
            f"Pipeline simulator started: {rate} flows/s, "
            f"alert ratio {alert_ratio:.0%}, "
            f"duration={'forever' if not duration else f'{duration}m'}"
        ))

        try:
            while True:
                if end_time and time.time() >= end_time:
                    break

                is_alert = random.random() < alert_ratio
                now_str = datetime.utcnow().isoformat() + "Z"

                if is_alert:
                    event = self._generate_alert(now_str)
                    self._push_alert(event, es, producer)
                    alert_count += 1
                else:
                    event = self._generate_flow(now_str)
                    self._push_flow(event, es, producer)
                    flow_count += 1

                if (flow_count + alert_count) % 50 == 0:
                    self.stdout.write(f"  flows={flow_count}  alerts={alert_count}", ending="\r")
                    self.stdout.flush()

                time.sleep(interval)
        except KeyboardInterrupt:
            pass
        finally:
            if producer:
                producer.flush(5)
            self.stdout.write(self.style.SUCCESS(
                f"\nStopped. Totals: {flow_count} flows, {alert_count} alerts"
            ))

    # -- Generators ----------------------------------------------------------

    def _generate_flow(self, ts: str) -> dict:
        proto = random.choice(PROTOCOLS)
        src = random.choice(INTERNAL_SUBNETS)
        dst = random.choice(EXTERNAL_IPS) if random.random() < 0.7 else random.choice(INTERNAL_SUBNETS)

        if proto in ("HTTP", "HTTPS"):
            orig = random.randint(500, 50_000)
            resp = random.randint(10_000, 5_000_000)
        elif proto == "DNS":
            orig = random.randint(40, 200)
            resp = random.randint(60, 800)
        else:
            orig = random.randint(100, 200_000)
            resp = random.randint(100, 200_000)

        return {
            "@timestamp": ts,
            "source_ip": src,
            "destination_ip": dst,
            "source_port": random.randint(1024, 65535),
            "destination_port": PORT_MAP.get(proto, random.choice([80, 443, 22, 53, 8080, 3389])),
            "proto": proto,
            "orig_bytes": orig,
            "resp_bytes": resp,
            "bytes": orig + resp,
            "packets_sent": random.randint(1, 200),
            "packets_received": random.randint(1, 200),
            "conn_state": random.choice(["ESTABLISHED", "CLOSED", "SYN_SENT", "FIN_WAIT"]),
            "duration": round(random.uniform(0.01, 600.0), 3),
            "service": random.choice(SERVICES) if random.random() > 0.4 else None,
        }

    def _generate_alert(self, ts: str) -> dict:
        sig, cat, sev = random.choice(ALERT_SIGNATURES)
        src = random.choice(MALICIOUS_IPS) if random.random() < 0.6 else random.choice(EXTERNAL_IPS)
        dst = random.choice(INTERNAL_SUBNETS)
        proto = random.choice(["TCP", "UDP", "HTTP", "HTTPS", "DNS"])

        return {
            "@timestamp": ts,
            "event_type": "alert",
            "source_ip": src,
            "destination_ip": dst,
            "source_port": random.randint(1024, 65535),
            "destination_port": PORT_MAP.get(proto, random.choice([80, 443, 22, 53])),
            "proto": proto,
            "alert": {
                "signature": sig,
                "signature_id": random.randint(2000000, 2999999),
                "severity": sev,
                "category": cat,
            },
        }

    # -- Push helpers ---------------------------------------------------------

    def _push_flow(self, event: dict, es, producer):
        idx = f"network-flows-{datetime.utcnow().strftime('%Y.%m.%d')}"
        if es:
            try:
                es.index(index=idx, document=event)
            except Exception as exc:
                logger.debug("ES flow index error: %s", exc)

        if producer:
            try:
                producer.produce("network_flows", json.dumps(event).encode())
            except Exception as exc:
                logger.debug("Kafka flow produce error: %s", exc)

        try:
            NetworkTraffic.objects.create(
                timestamp=timezone.now(),
                source_ip=event["source_ip"],
                destination_ip=event["destination_ip"],
                source_port=event["source_port"],
                destination_port=event["destination_port"],
                protocol=event["proto"],
                bytes_sent=event.get("orig_bytes", 0),
                bytes_received=event.get("resp_bytes", 0),
                packets_sent=event.get("packets_sent", 0),
                packets_received=event.get("packets_received", 0),
                connection_state=event.get("conn_state", "ESTABLISHED"),
                duration=event.get("duration", 0.0),
                application=event.get("service"),
                country_code=random.choice(COUNTRIES) if random.random() < 0.3 else None,
            )
        except Exception as exc:
            logger.debug("ORM flow create error: %s", exc)

    def _push_alert(self, event: dict, es, producer):
        idx = f"security-alerts-{datetime.utcnow().strftime('%Y.%m.%d')}"
        if es:
            try:
                es.index(index=idx, document=event)
            except Exception as exc:
                logger.debug("ES alert index error: %s", exc)

        if producer:
            try:
                producer.produce("security_alerts", json.dumps(event).encode())
            except Exception as exc:
                logger.debug("Kafka alert produce error: %s", exc)

        CATEGORY_MAP = {
            "Attempted Information Leak": "port_scan",
            "Potentially Bad Traffic": "suspicious_traffic",
            "A Network Trojan was Detected": "malware",
            "Attempted Administrator Privilege Gain": "brute_force",
            "Web Application Attack": "intrusion",
            "Attempted Denial of Service": "ddos",
            "Misc activity": "suspicious_traffic",
        }
        alert_info = event.get("alert", {})
        category = alert_info.get("category", "")
        try:
            SecurityAlert.objects.create(
                title=alert_info.get("signature", "Security Alert"),
                description=category or "N/A",
                severity=_severity_label(alert_info.get("severity", 3)),
                alert_type=CATEGORY_MAP.get(category, "intrusion"),
                status="new",
                source_ip=event.get("source_ip"),
                destination_ip=event.get("destination_ip"),
                source_port=event.get("source_port"),
                destination_port=event.get("destination_port"),
                protocol=event.get("proto"),
                signature=alert_info.get("signature"),
                rule_id=str(alert_info.get("signature_id", "")),
                country_code=random.choice(COUNTRIES) if random.random() < 0.5 else None,
                timestamp=timezone.now(),
            )
        except Exception as exc:
            logger.debug("ORM alert create error: %s", exc)

    # -- Connections ----------------------------------------------------------

    def _connect_es(self):
        try:
            from elasticsearch import Elasticsearch
            from decouple import config
            host = config("ELASTICSEARCH_HOST", default="http://localhost:9200")
            es = Elasticsearch(hosts=[host], request_timeout=10)
            if es.ping():
                self.stdout.write(self.style.SUCCESS(f"ES connected: {host}"))
                return es
        except Exception as exc:
            self.stdout.write(self.style.WARNING(f"ES unavailable: {exc}"))
        return None

    def _connect_kafka(self):
        try:
            from confluent_kafka import Producer
            from decouple import config
            bootstrap = config("KAFKA_BOOTSTRAP_SERVERS", default="localhost:9092")
            p = Producer({"bootstrap.servers": bootstrap})
            self.stdout.write(self.style.SUCCESS(f"Kafka producer connected: {bootstrap}"))
            return p
        except Exception as exc:
            self.stdout.write(self.style.WARNING(f"Kafka unavailable: {exc}"))
        return None
