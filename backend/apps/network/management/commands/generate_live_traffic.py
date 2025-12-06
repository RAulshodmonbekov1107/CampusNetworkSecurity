from django.core.management.base import BaseCommand
from django.utils import timezone
from decouple import config
from confluent_kafka import Producer
import json
import random
import time
from datetime import datetime


class Command(BaseCommand):
    help = "Continuously generate and publish live network traffic data to Kafka for testing"

    def add_arguments(self, parser):
        parser.add_argument(
            "--bootstrap",
            type=str,
            default=None,
            help="Kafka bootstrap servers (default: from KAFKA_BOOTSTRAP_SERVERS env or kafka:9092)",
        )
        parser.add_argument(
            "--interval",
            type=float,
            default=2.0,
            help="Seconds between each event (default: 2.0)",
        )
        parser.add_argument(
            "--count",
            type=int,
            default=None,
            help="Number of events to generate (default: infinite)",
        )

    def handle(self, *args, **options):
        bootstrap = options.get("bootstrap") or config(
            "KAFKA_BOOTSTRAP_SERVERS", default="kafka:9092"
        )
        interval = options.get("interval", 2.0)
        count = options.get("count")

        producer_conf = {"bootstrap.servers": bootstrap}
        producer = Producer(producer_conf)

        protocols = ["TCP", "UDP", "HTTP", "HTTPS", "SSH", "DNS", "ICMP"]
        states = ["ESTABLISHED", "SYN_SENT", "SYN_RECV", "FIN_WAIT", "TIME_WAIT"]
        applications = ["Chrome", "Firefox", "SSH", "MySQL", "PostgreSQL", "Apache", "Nginx"]

        self.stdout.write(
            self.style.SUCCESS(
                f"Generating live traffic data to Kafka ({bootstrap}) every {interval}s..."
            )
        )
        self.stdout.write("Press Ctrl+C to stop")

        generated = 0
        try:
            while count is None or generated < count:
                # Generate a network flow event
                now = timezone.now()
                source_ip = f"192.168.1.{random.randint(1, 254)}"
                dest_ip = f"{random.randint(1, 223)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"
                proto = random.choice(protocols)
                orig_bytes = random.randint(100, 10000000)
                resp_bytes = random.randint(100, 10000000)

                event = {
                    "@timestamp": now.isoformat(),
                    "source_ip": source_ip,
                    "destination_ip": dest_ip,
                    "source_port": random.randint(1024, 65535),
                    "destination_port": random.choice([80, 443, 22, 3306, 5432, 8080, 3389]),
                    "proto": proto,
                    "orig_bytes": orig_bytes,
                    "resp_bytes": resp_bytes,
                    "bytes": orig_bytes + resp_bytes,  # Total for ES aggregation
                    "packets_sent": random.randint(1, 1000),
                    "packets_received": random.randint(1, 1000),
                    "conn_state": random.choice(states),
                    "duration": random.uniform(0.1, 3600.0),
                    "service": random.choice(applications) if random.random() > 0.3 else None,
                }

                # Publish to Kafka
                producer.produce(
                    "network_flows",
                    key=source_ip.encode("utf-8"),
                    value=json.dumps(event).encode("utf-8"),
                    callback=self._delivery_callback,
                )
                producer.poll(0)

                generated += 1
                if generated % 10 == 0:
                    self.stdout.write(f"Generated {generated} events...")

                time.sleep(interval)

        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("\nStopping data generation..."))
        finally:
            producer.flush()
            self.stdout.write(
                self.style.SUCCESS(f"\nTotal events generated: {generated}")
            )

    def _delivery_callback(self, err, msg):
        if err:
            self.stderr.write(f"Message delivery failed: {err}")
        # Success - silently continue

