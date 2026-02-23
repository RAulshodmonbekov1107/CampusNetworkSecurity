"""
Django management command to generate live network traffic data continuously.
Perfect for demos and presentations!

Usage:
    python manage.py generate_live_traffic
    python manage.py generate_live_traffic --rate 5  # 5 events per second
    python manage.py generate_live_traffic --to-db    # Also save to database
"""
import time
import random
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from elasticsearch import Elasticsearch
from apps.network.models import NetworkTraffic

# Realistic data pools
PROTOCOLS = ["TCP", "UDP", "HTTP", "HTTPS", "SSH", "DNS", "ICMP", "FTP", "SMTP"]
APPLICATIONS = ["Chrome", "Firefox", "Safari", "SSH", "MySQL", "PostgreSQL", "Apache", "Nginx", "Docker", "Kubernetes"]
INTERNAL_IPS = [f"192.168.1.{i}" for i in range(1, 255)] + [f"10.0.0.{i}" for i in range(1, 100)]
EXTERNAL_IPS = [
    "8.8.8.8", "8.8.4.4",  # Google DNS
    "1.1.1.1", "1.0.0.1",  # Cloudflare
    "208.67.222.222",  # OpenDNS
    "142.250.191.14",  # Google
    "13.107.42.14",  # Microsoft
    "151.101.1.140",  # Reddit
    "104.16.132.229",  # Cloudflare
]
COMMON_PORTS = {
    "HTTP": 80,
    "HTTPS": 443,
    "SSH": 22,
    "DNS": 53,
    "FTP": 21,
    "SMTP": 25,
    "MySQL": 3306,
    "PostgreSQL": 5432,
}


class Command(BaseCommand):
    help = 'Generate live network traffic data continuously for demos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--rate',
            type=float,
            default=2.0,
            help='Events per second (default: 2.0)',
        )
        parser.add_argument(
            '--to-db',
            action='store_true',
            help='Also save to Django database (slower but more complete)',
        )
        parser.add_argument(
            '--duration',
            type=int,
            default=0,
            help='Run for N minutes (0 = run forever)',
        )

    def handle(self, *args, **options):
        rate = options['rate']
        to_db = options['to_db']
        duration = options['duration']
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n🚀 Starting live traffic generator!\n'
                f'   Rate: {rate} events/second\n'
                f'   To Database: {to_db}\n'
                f'   Duration: {"Forever" if duration == 0 else f"{duration} minutes"}\n'
                f'   Press Ctrl+C to stop\n'
            )
        )

        # Connect to Elasticsearch
        try:
            es = Elasticsearch(['http://elasticsearch:9200'], request_timeout=5)
            es.ping()
            self.stdout.write(self.style.SUCCESS('✅ Connected to Elasticsearch'))
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(
                    f'⚠️  Elasticsearch not available: {e}\n'
                    f'   Continuing with database only...'
                )
            )
            es = None

        interval = 1.0 / rate
        start_time = time.time()
        end_time = start_time + (duration * 60) if duration > 0 else None
        event_count = 0

        try:
            while True:
                if end_time and time.time() >= end_time:
                    break

                # Generate realistic traffic event
                event = self._generate_event()
                event_count += 1

                # Send to Elasticsearch
                if es:
                    try:
                        index_name = f"network-flows-{datetime.now().strftime('%Y.%m.%d')}"
                        es.index(index=index_name, document=event)
                    except Exception as e:
                        self.stdout.write(
                            self.style.WARNING(f'ES error: {e}')
                        )

                # Save to database if requested
                if to_db:
                    try:
                        NetworkTraffic.objects.create(
                            timestamp=timezone.make_aware(
                                datetime.fromisoformat(event['@timestamp'].replace('Z', '+00:00'))
                            ),
                            source_ip=event['source_ip'],
                            destination_ip=event['destination_ip'],
                            source_port=event['source_port'],
                            destination_port=event['destination_port'],
                            protocol=event['proto'],
                            bytes_sent=event.get('orig_bytes', 0),
                            bytes_received=event.get('resp_bytes', 0),
                            connection_state=event.get('conn_state', 'ESTABLISHED'),
                            application=event.get('service'),
                        )
                    except Exception as e:
                        self.stdout.write(
                            self.style.WARNING(f'DB error: {e}')
                        )

                # Progress indicator
                if event_count % 10 == 0:
                    self.stdout.write(
                        f'📊 Generated {event_count} events...',
                        ending='\r'
                    )

                time.sleep(interval)

        except KeyboardInterrupt:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n\n✅ Stopped! Generated {event_count} total events.\n'
                )
            )

    def _generate_event(self):
        """Generate a realistic network traffic event."""
        now = datetime.now()
        proto = random.choice(PROTOCOLS)
        
        # 70% internal to external, 30% internal to internal
        if random.random() < 0.7:
            source_ip = random.choice(INTERNAL_IPS)
            dest_ip = random.choice(EXTERNAL_IPS)
        else:
            source_ip = random.choice(INTERNAL_IPS)
            dest_ip = random.choice(INTERNAL_IPS)

        # Realistic port based on protocol
        if proto in COMMON_PORTS:
            dest_port = COMMON_PORTS[proto]
        else:
            dest_port = random.choice([80, 443, 22, 53, 3306, 5432, 8080, 3389])

        # Realistic byte sizes
        if proto in ["HTTP", "HTTPS"]:
            orig_bytes = random.randint(500, 50000)  # Request size
            resp_bytes = random.randint(10000, 5000000)  # Response size
        elif proto == "SSH":
            orig_bytes = random.randint(100, 5000)
            resp_bytes = random.randint(100, 5000)
        else:
            orig_bytes = random.randint(100, 100000)
            resp_bytes = random.randint(100, 100000)

        total_bytes = orig_bytes + resp_bytes

        return {
            "@timestamp": now.isoformat() + "Z",
            "source_ip": source_ip,
            "destination_ip": dest_ip,
            "source_port": random.randint(1024, 65535),
            "destination_port": dest_port,
            "proto": proto,
            "orig_bytes": orig_bytes,
            "resp_bytes": resp_bytes,
            "bytes": total_bytes,
            "packets_sent": random.randint(1, 100),
            "packets_received": random.randint(1, 100),
            "conn_state": random.choice(["ESTABLISHED", "CLOSED", "SYN_SENT", "FIN_WAIT"]),
            "duration": random.uniform(0.1, 300.0),
            "service": random.choice(APPLICATIONS) if random.random() > 0.4 else None,
        }
