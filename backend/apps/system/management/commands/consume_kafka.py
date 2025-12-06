from django.core.management.base import BaseCommand
from django.utils import timezone
from decouple import config
from confluent_kafka import Consumer
import json

from apps.network.models import NetworkTraffic
from apps.alerts.models import SecurityAlert


class Command(BaseCommand):
    help = "Consume normalized events from Kafka and persist into Django models."

    def add_arguments(self, parser):
        parser.add_argument(
            "--group-id",
            type=str,
            default="campus-security-consumer",
            help="Kafka consumer group id",
        )
        parser.add_argument(
            "--bootstrap",
            type=str,
            help="Bootstrap servers override (e.g. localhost:9092)",
        )

    def handle(self, *args, **options):
        bootstrap_servers = options.get("bootstrap") or config(
            "KAFKA_BOOTSTRAP_SERVERS", default="localhost:9092"
        )
        group_id = options["group_id"]

        consumer_conf = {
            "bootstrap.servers": bootstrap_servers,
            "group.id": group_id,
            "auto.offset.reset": "latest",
        }

        consumer = Consumer(consumer_conf)
        topics = ["network_flows", "security_alerts"]
        consumer.subscribe(topics)

        self.stdout.write(
            self.style.SUCCESS(
                f"Consuming from Kafka topics {topics} on {bootstrap_servers}"
            )
        )

        try:
            while True:
                msg = consumer.poll(1.0)
                if msg is None:
                    continue
                if msg.error():
                    self.stderr.write(f"Kafka error: {msg.error()}")
                    continue

                try:
                    payload = json.loads(msg.value().decode("utf-8"))
                except Exception as exc:
                    self.stderr.write(f"Failed to decode Kafka message: {exc}")
                    continue

                topic = msg.topic()
                if topic == "network_flows":
                    self._handle_network_flow(payload)
                elif topic == "security_alerts":
                    self._handle_security_alert(payload)
        except KeyboardInterrupt:
            self.stdout.write("Stopping Kafka consumer...")
        finally:
            consumer.close()

    def _handle_network_flow(self, data: dict) -> None:
        """
        Map a normalized network flow event into NetworkTraffic model.
        This assumes Logstash has already normalized field names.
        """
        try:
            NetworkTraffic.objects.create(
                timestamp=data.get("@timestamp", timezone.now()),
                source_ip=data.get("source_ip"),
                destination_ip=data.get("destination_ip"),
                source_port=data.get("source_port") or 0,
                destination_port=data.get("destination_port") or 0,
                protocol=data.get("proto", "TCP"),
                bytes_sent=data.get("orig_bytes", 0),
                bytes_received=data.get("resp_bytes", 0),
                packets_sent=data.get("packets_sent", 0),
                packets_received=data.get("packets_received", 0),
                connection_state=data.get("conn_state", "ESTABLISHED"),
                duration=data.get("duration", 0.0),
                application=data.get("service"),
                country_code=data.get("geoip", {}).get("country_code2"),
            )
        except Exception as exc:
            self.stderr.write(f"Failed to store NetworkTraffic: {exc}")

    def _handle_security_alert(self, data: dict) -> None:
        """
        Map a normalized Suricata/Zeek alert event into SecurityAlert model.
        """
        alert = data.get("alert", {})

        try:
            SecurityAlert.objects.create(
                title=alert.get("signature", "Security Alert"),
                description=alert.get("category", "N/A"),
                severity=self._map_severity(alert.get("severity")),
                alert_type=alert.get("category", "intrusion"),
                status="new",
                source_ip=data.get("source_ip"),
                destination_ip=data.get("destination_ip"),
                source_port=data.get("source_port"),
                destination_port=data.get("destination_port"),
                protocol=data.get("proto"),
                signature=alert.get("signature"),
                rule_id=str(alert.get("signature_id")),
                country_code=data.get("geoip", {}).get("country_code2"),
                timestamp=data.get("@timestamp", timezone.now()),
            )
        except Exception as exc:
            self.stderr.write(f"Failed to store SecurityAlert: {exc}")

    @staticmethod
    def _map_severity(suricata_severity: int | None) -> str:
        """
        Map Suricata numeric severity (1-3) to our severity levels.
        """
        if suricata_severity is None:
            return "medium"
        if suricata_severity == 1:
            return "critical"
        if suricata_severity == 2:
            return "high"
        if suricata_severity == 3:
            return "medium"
        return "low"


