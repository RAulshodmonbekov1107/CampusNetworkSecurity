from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.system.elasticsearch_client import get_es_client
import random
from datetime import datetime, timedelta


class Command(BaseCommand):
    help = "Inject network traffic data directly into Elasticsearch for dashboard testing"

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=100,
            help="Number of events to inject (default: 100)",
        )
        parser.add_argument(
            "--hours",
            type=int,
            default=24,
            help="Spread events over last N hours (default: 24)",
        )

    def handle(self, *args, **options):
        count = options.get("count", 100)
        hours = options.get("hours", 24)

        es = get_es_client()
        if not es:
            self.stdout.write(self.style.ERROR("Elasticsearch client not available"))
            return

        protocols = ["TCP", "UDP", "HTTP", "HTTPS", "SSH", "DNS", "ICMP"]
        applications = ["Chrome", "Firefox", "SSH", "MySQL", "PostgreSQL", "Apache", "Nginx"]

        self.stdout.write(f"Injecting {count} events into Elasticsearch...")

        now = timezone.now()
        events = []
        for i in range(count):
            timestamp = now - timedelta(
                hours=random.randint(0, hours),
                minutes=random.randint(0, 59),
                seconds=random.randint(0, 59),
            )
            source_ip = f"192.168.1.{random.randint(1, 254)}"
            dest_ip = f"{random.randint(1, 223)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"
            orig_bytes = random.randint(100, 10000000)
            resp_bytes = random.randint(100, 10000000)
            total_bytes = orig_bytes + resp_bytes

            event = {
                "@timestamp": timestamp.isoformat(),
                "source_ip": source_ip,
                "destination_ip": dest_ip,
                "source_port": random.randint(1024, 65535),
                "destination_port": random.choice([80, 443, 22, 3306, 5432, 8080, 3389]),
                "proto": random.choice(protocols),
                "orig_bytes": orig_bytes,
                "resp_bytes": resp_bytes,
                "bytes": total_bytes,  # Total for aggregation
                "packets_sent": random.randint(1, 1000),
                "packets_received": random.randint(1, 1000),
                "conn_state": "ESTABLISHED",
                "duration": random.uniform(0.1, 3600.0),
                "service": random.choice(applications) if random.random() > 0.3 else None,
            }
            events.append(event)

        # Bulk index to Elasticsearch
        index_name = f"network-flows-{datetime.now().strftime('%Y.%m.%d')}"
        try:
            from elasticsearch.helpers import bulk

            actions = [
                {
                    "_index": index_name,
                    "_source": event,
                }
                for event in events
            ]

            success, failed = bulk(es, actions, raise_on_error=False)
            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully indexed {success} events to {index_name}"
                )
            )
            if failed:
                self.stdout.write(self.style.WARNING(f"Failed to index {len(failed)} events"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error indexing to Elasticsearch: {e}"))

