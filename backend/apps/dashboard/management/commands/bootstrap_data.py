"""
One-shot bootstrap: seeds Elasticsearch + Django ORM so the dashboard
shows useful data on first load. Safe to run multiple times — it skips
seeding if the DB already has records.

Usage:
    python manage.py bootstrap_data
    python manage.py bootstrap_data --force   (ignores existing data check)
"""
import random
import logging
from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.utils import timezone

from apps.network.models import NetworkTraffic
from apps.alerts.models import SecurityAlert
from apps.threats.models import ThreatIntelligence

logger = logging.getLogger(__name__)

INTERNAL_SUBNETS = [f"192.168.1.{i}" for i in range(1, 255)]
EXTERNAL_IPS = [
    "8.8.8.8", "1.1.1.1", "142.250.191.14", "13.107.42.14",
    "151.101.1.140", "104.16.132.229", "185.199.108.153",
    "52.84.150.11", "93.184.216.34",
]
MALICIOUS_IPS = [
    "45.33.32.156", "198.51.100.99", "203.0.113.42", "185.220.101.15",
    "91.219.237.229", "176.10.99.200", "171.25.193.9",
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
    ("ET SCAN Aggressive Port Scan", "Attempted Information Leak", 2),
    ("ET MALWARE Ransomware Checkin", "A Network Trojan was Detected", 1),
    ("ET WEB_SERVER SQL Injection Attempt", "Web Application Attack", 1),
]


class Command(BaseCommand):
    help = "Bootstrap initial data into ES and Django ORM for first-run experience"

    def add_arguments(self, parser):
        parser.add_argument("--force", action="store_true", help="Seed even if data already exists")
        parser.add_argument("--es-count", type=int, default=2000, help="ES documents to inject")
        parser.add_argument("--traffic", type=int, default=500, help="ORM traffic records")
        parser.add_argument("--alerts", type=int, default=100, help="ORM alert records")
        parser.add_argument("--threats", type=int, default=50, help="ORM threat records")

    def handle(self, *args, **options):
        force = options["force"]

        if not force and NetworkTraffic.objects.count() > 10:
            self.stdout.write(self.style.WARNING(
                "Data already exists (use --force to re-seed). Skipping."
            ))
            return

        self.stdout.write(self.style.NOTICE("Starting bootstrap..."))

        self._seed_es(options["es_count"])
        self._seed_orm_traffic(options["traffic"])
        self._seed_orm_alerts(options["alerts"])
        self._seed_orm_threats(options["threats"])

        self.stdout.write(self.style.SUCCESS("Bootstrap complete."))

    def _seed_es(self, count: int):
        """Bulk-index historical flow and alert documents into ES."""
        try:
            from elasticsearch import Elasticsearch
            from elasticsearch.helpers import bulk
            from decouple import config
        except ImportError:
            self.stdout.write(self.style.WARNING("elasticsearch library not available, skipping ES seeding"))
            return

        host = config("ELASTICSEARCH_HOST", default="http://localhost:9200")
        try:
            es = Elasticsearch(hosts=[host], request_timeout=30)
            if not es.ping():
                self.stdout.write(self.style.WARNING("ES unreachable, skipping"))
                return
        except Exception as exc:
            self.stdout.write(self.style.WARNING(f"ES connection failed: {exc}"))
            return

        now = datetime.utcnow()
        actions = []

        flow_count = int(count * 0.85)
        alert_count = count - flow_count

        for _ in range(flow_count):
            ts = now - timedelta(
                hours=random.randint(0, 24),
                minutes=random.randint(0, 59),
                seconds=random.randint(0, 59),
            )
            proto = random.choice(PROTOCOLS)
            orig = random.randint(100, 5_000_000)
            resp = random.randint(100, 5_000_000)
            actions.append({
                "_index": f"network-flows-{ts.strftime('%Y.%m.%d')}",
                "_source": {
                    "@timestamp": ts.isoformat() + "Z",
                    "source_ip": random.choice(INTERNAL_SUBNETS),
                    "destination_ip": random.choice(EXTERNAL_IPS),
                    "source_port": random.randint(1024, 65535),
                    "destination_port": PORT_MAP.get(proto, random.choice([80, 443, 22, 53, 8080])),
                    "proto": proto,
                    "orig_bytes": orig,
                    "resp_bytes": resp,
                    "bytes": orig + resp,
                    "packets_sent": random.randint(1, 500),
                    "packets_received": random.randint(1, 500),
                    "conn_state": random.choice(["ESTABLISHED", "CLOSED", "SYN_SENT"]),
                    "duration": round(random.uniform(0.01, 600.0), 3),
                    "service": random.choice(SERVICES) if random.random() > 0.3 else None,
                },
            })

        for _ in range(alert_count):
            ts = now - timedelta(
                hours=random.randint(0, 24),
                minutes=random.randint(0, 59),
                seconds=random.randint(0, 59),
            )
            sig, cat, sev = random.choice(ALERT_SIGNATURES)
            actions.append({
                "_index": f"security-alerts-{ts.strftime('%Y.%m.%d')}",
                "_source": {
                    "@timestamp": ts.isoformat() + "Z",
                    "event_type": "alert",
                    "source_ip": random.choice(MALICIOUS_IPS),
                    "destination_ip": random.choice(INTERNAL_SUBNETS),
                    "source_port": random.randint(1024, 65535),
                    "destination_port": random.choice([80, 443, 22, 53]),
                    "proto": random.choice(["TCP", "UDP", "HTTP"]),
                    "alert": {
                        "signature": sig,
                        "signature_id": random.randint(2000000, 2999999),
                        "severity": sev,
                        "category": cat,
                    },
                },
            })

        try:
            success, errors = bulk(es, actions, raise_on_error=False)
            self.stdout.write(self.style.SUCCESS(f"ES: indexed {success} docs ({flow_count} flows + {alert_count} alerts)"))
            if errors:
                self.stdout.write(self.style.WARNING(f"ES: {len(errors)} errors"))
        except Exception as exc:
            self.stdout.write(self.style.ERROR(f"ES bulk index failed: {exc}"))

    def _seed_orm_traffic(self, count: int):
        now = timezone.now()
        records = []
        for _ in range(count):
            ts = now - timedelta(hours=random.randint(0, 24), minutes=random.randint(0, 59), seconds=random.randint(0, 59))
            proto = random.choice(PROTOCOLS)
            records.append(NetworkTraffic(
                timestamp=ts,
                source_ip=random.choice(INTERNAL_SUBNETS),
                destination_ip=random.choice(EXTERNAL_IPS) if random.random() < 0.7 else random.choice(INTERNAL_SUBNETS),
                source_port=random.randint(1024, 65535),
                destination_port=PORT_MAP.get(proto, random.choice([80, 443, 22, 53, 8080])),
                protocol=proto,
                bytes_sent=random.randint(100, 5_000_000),
                bytes_received=random.randint(100, 5_000_000),
                packets_sent=random.randint(1, 500),
                packets_received=random.randint(1, 500),
                connection_state=random.choice(["ESTABLISHED", "CLOSED", "SYN_SENT", "FIN_WAIT"]),
                duration=round(random.uniform(0.01, 600.0), 3),
                application=random.choice(SERVICES) if random.random() > 0.3 else None,
                country_code=random.choice(COUNTRIES) if random.random() < 0.5 else None,
            ))
        NetworkTraffic.objects.bulk_create(records, batch_size=500)
        self.stdout.write(self.style.SUCCESS(f"ORM: created {count} traffic records"))

    def _seed_orm_alerts(self, count: int):
        now = timezone.now()
        sev_map = {1: "critical", 2: "high", 3: "medium"}
        records = []
        for _ in range(count):
            ts = now - timedelta(hours=random.randint(0, 72), minutes=random.randint(0, 59))
            sig, cat, sev = random.choice(ALERT_SIGNATURES)
            records.append(SecurityAlert(
                title=sig,
                description=cat,
                severity=sev_map.get(sev, "medium"),
                alert_type=random.choice(["intrusion", "malware", "port_scan", "brute_force", "suspicious_traffic"]),
                status=random.choice(["new", "new", "acknowledged", "resolved"]),
                source_ip=random.choice(MALICIOUS_IPS) if random.random() < 0.6 else random.choice(EXTERNAL_IPS),
                destination_ip=random.choice(INTERNAL_SUBNETS),
                source_port=random.randint(1024, 65535),
                destination_port=random.choice([80, 443, 22, 53]),
                protocol=random.choice(["TCP", "UDP", "HTTP"]),
                signature=sig,
                rule_id=str(random.randint(2000000, 2999999)),
                country_code=random.choice(COUNTRIES) if random.random() < 0.5 else None,
                timestamp=ts,
            ))
        SecurityAlert.objects.bulk_create(records, batch_size=500)
        self.stdout.write(self.style.SUCCESS(f"ORM: created {count} alert records"))

    def _seed_orm_threats(self, count: int):
        now = timezone.now()
        threat_types = ["malware", "phishing", "botnet", "c2", "exploit", "ransomware", "trojan"]
        sources = ["VirusTotal", "MISP", "AbuseIPDB", "AlienVault OTX", "OSINT"]
        records = []

        for i in range(count):
            ioc_type = random.choice(["ip", "domain", "url", "hash"])
            if ioc_type == "ip":
                ioc_value = random.choice(MALICIOUS_IPS) + f".{i}"
                ioc_value = f"{random.randint(1,223)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"
            elif ioc_type == "domain":
                ioc_value = f"{random.choice(['mal','phish','c2','evil'])}{random.randint(1,999)}.{''.join(random.choices('abcdefghijklmnopqrstuvwxyz',k=3))}"
            elif ioc_type == "url":
                ioc_value = f"http://{random.choice(['malicious','suspicious','phish'])}{random.randint(1,99)}.com/payload"
            else:
                ioc_value = "".join(random.choices("0123456789abcdef", k=64))

            first_seen = now - timedelta(days=random.randint(1, 180))
            records.append(ThreatIntelligence(
                ioc_type=ioc_type,
                ioc_value=ioc_value,
                threat_type=random.choice(threat_types),
                description=f"Known threat indicator ({ioc_type})",
                reputation_score=random.randint(40, 100),
                source=random.choice(sources),
                first_seen=first_seen,
                last_seen=first_seen + timedelta(days=random.randint(0, 30)),
                country_code=random.choice(COUNTRIES) if random.random() < 0.7 else None,
                latitude=round(random.uniform(-60, 60), 4) if random.random() < 0.4 else None,
                longitude=round(random.uniform(-120, 120), 4) if random.random() < 0.4 else None,
                tags=[random.choice(threat_types)] if random.random() < 0.5 else [],
                metadata={},
                is_active=random.random() < 0.75,
            ))

        ThreatIntelligence.objects.bulk_create(records, batch_size=500, ignore_conflicts=True)
        self.stdout.write(self.style.SUCCESS(f"ORM: created {count} threat intel records"))
