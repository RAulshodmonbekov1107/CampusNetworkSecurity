from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import random
from apps.network.models import NetworkTraffic
from apps.alerts.models import SecurityAlert
from apps.threats.models import ThreatIntelligence


class Command(BaseCommand):
    help = 'Generate mock data for development'

    def add_arguments(self, parser):
        parser.add_argument(
            '--traffic',
            type=int,
            default=1000,
            help='Number of network traffic records to generate',
        )
        parser.add_argument(
            '--alerts',
            type=int,
            default=50,
            help='Number of security alerts to generate',
        )
        parser.add_argument(
            '--threats',
            type=int,
            default=30,
            help='Number of threat intelligence records to generate',
        )

    def handle(self, *args, **options):
        self.stdout.write('Generating mock data...')

        # Generate Network Traffic
        self.stdout.write(f'Generating {options["traffic"]} network traffic records...')
        protocols = ['TCP', 'UDP', 'HTTP', 'HTTPS', 'SSH', 'DNS', 'ICMP']
        states = ['ESTABLISHED', 'SYN_SENT', 'SYN_RECV', 'FIN_WAIT', 'TIME_WAIT']
        applications = ['Chrome', 'Firefox', 'SSH', 'MySQL', 'PostgreSQL', 'Apache', 'Nginx', None]

        traffic_records = []
        now = timezone.now()
        for i in range(options['traffic']):
            timestamp = now - timedelta(
                hours=random.randint(0, 24),
                minutes=random.randint(0, 59),
                seconds=random.randint(0, 59)
            )
            traffic_records.append(NetworkTraffic(
                timestamp=timestamp,
                source_ip=f"192.168.1.{random.randint(1, 254)}",
                destination_ip=f"{random.randint(1, 223)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}",
                source_port=random.randint(1024, 65535),
                destination_port=random.choice([80, 443, 22, 3306, 5432, 8080, 3389]),
                protocol=random.choice(protocols),
                bytes_sent=random.randint(100, 10000000),
                bytes_received=random.randint(100, 10000000),
                packets_sent=random.randint(1, 1000),
                packets_received=random.randint(1, 1000),
                connection_state=random.choice(states),
                duration=random.uniform(0.1, 3600.0),
                application=random.choice(applications),
                country_code=random.choice(['US', 'RU', 'CN', 'DE', 'GB', 'FR', None]),
            ))

        NetworkTraffic.objects.bulk_create(traffic_records, batch_size=500)
        self.stdout.write(self.style.SUCCESS(f'Created {len(traffic_records)} network traffic records'))

        # Generate Security Alerts
        self.stdout.write(f'Generating {options["alerts"]} security alerts...')
        severities = ['critical', 'high', 'medium', 'low']
        alert_types = ['intrusion', 'malware', 'ddos', 'port_scan', 'brute_force', 'suspicious_traffic']
        statuses = ['new', 'acknowledged', 'resolved', 'false_positive']
        alert_titles = [
            'Suspicious port scan detected',
            'Brute force attack attempt',
            'Malware signature detected',
            'Unauthorized access attempt',
            'DDoS attack detected',
            'Data exfiltration attempt',
            'Suspicious network activity',
            'Intrusion attempt blocked',
        ]

        alert_records = []
        for i in range(options['alerts']):
            timestamp = now - timedelta(
                hours=random.randint(0, 72),
                minutes=random.randint(0, 59)
            )
            severity = random.choice(severities)
            alert_records.append(SecurityAlert(
                title=random.choice(alert_titles),
                description=f"Security alert detected from {random.choice(['external', 'internal'])} source",
                severity=severity,
                alert_type=random.choice(alert_types),
                status=random.choice(statuses),
                source_ip=f"{random.randint(1, 223)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}",
                destination_ip=f"192.168.1.{random.randint(1, 254)}" if random.choice([True, False]) else None,
                source_port=random.randint(1024, 65535) if random.choice([True, False]) else None,
                destination_port=random.choice([80, 443, 22, 3306, 5432]) if random.choice([True, False]) else None,
                protocol=random.choice(protocols) if random.choice([True, False]) else None,
                signature=f"SIG-{random.randint(1000, 9999)}",
                rule_id=f"RULE-{random.randint(100, 999)}",
                country_code=random.choice(['US', 'RU', 'CN', 'DE', 'GB', 'FR', None]),
                timestamp=timestamp,
            ))

        SecurityAlert.objects.bulk_create(alert_records, batch_size=500)
        self.stdout.write(self.style.SUCCESS(f'Created {len(alert_records)} security alerts'))

        # Generate Threat Intelligence
        self.stdout.write(f'Generating {options["threats"]} threat intelligence records...')
        ioc_types = ['ip', 'domain', 'url', 'hash', 'email']
        threat_types = ['malware', 'phishing', 'botnet', 'c2', 'exploit', 'ransomware', 'trojan']
        sources = ['VirusTotal', 'MISP', 'Custom', 'ThreatFeed', 'OSINT']
        countries = ['US', 'RU', 'CN', 'DE', 'GB', 'FR', 'KR', 'JP']

        threat_records = []
        for i in range(options['threats']):
            ioc_type = random.choice(ioc_types)
            if ioc_type == 'ip':
                ioc_value = f"{random.randint(1, 223)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"
            elif ioc_type == 'domain':
                ioc_value = f"{random.choice(['malicious', 'suspicious', 'phishing'])}{random.randint(1, 999)}.com"
            elif ioc_type == 'url':
                ioc_value = f"http://{random.choice(['malicious', 'suspicious'])}.com/path"
            elif ioc_type == 'hash':
                ioc_value = ''.join(random.choices('0123456789abcdef', k=64))
            else:  # email
                ioc_value = f"malicious{random.randint(1, 999)}@example.com"

            first_seen = now - timedelta(days=random.randint(1, 365))
            last_seen = first_seen + timedelta(days=random.randint(0, 30))

            threat_records.append(ThreatIntelligence(
                ioc_type=ioc_type,
                ioc_value=ioc_value,
                threat_type=random.choice(threat_types),
                description=f"Known {random.choice(threat_types)} threat",
                reputation_score=random.randint(40, 100),
                source=random.choice(sources),
                first_seen=first_seen,
                last_seen=last_seen,
                country_code=random.choice(countries + [None]),
                latitude=random.uniform(-90, 90) if random.choice([True, False]) else None,
                longitude=random.uniform(-180, 180) if random.choice([True, False]) else None,
                tags=[random.choice(['malware', 'phishing', 'botnet', 'c2'])] if random.choice([True, False]) else [],
                metadata={},
                is_active=random.choice([True, True, True, False]),  # 75% active
            ))

        ThreatIntelligence.objects.bulk_create(threat_records, batch_size=500)
        self.stdout.write(self.style.SUCCESS(f'Created {len(threat_records)} threat intelligence records'))

        self.stdout.write(self.style.SUCCESS('\nMock data generation completed!'))

