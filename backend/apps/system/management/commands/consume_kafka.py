import json
import logging
import time

from django.core.management.base import BaseCommand
from django.utils import timezone
from decouple import config
from confluent_kafka import Consumer
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from apps.network.models import NetworkTraffic
from apps.alerts.models import SecurityAlert

logger = logging.getLogger(__name__)

BATCH_SIZE = 100
BATCH_TIMEOUT_SECS = 2.0


class Command(BaseCommand):
    help = "Consume normalized events from Kafka and persist into Django models."

    CATEGORY_TO_TYPE = {
        "Attempted Information Leak": "port_scan",
        "Potentially Bad Traffic": "suspicious_traffic",
        "A Network Trojan was Detected": "malware",
        "Attempted Administrator Privilege Gain": "brute_force",
        "Web Application Attack": "intrusion",
        "Attempted Denial of Service": "ddos",
        "Misc activity": "suspicious_traffic",
    }

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
        parser.add_argument(
            "--batch-size",
            type=int,
            default=BATCH_SIZE,
            help="Max records per bulk write batch",
        )

    def handle(self, *args, **options):
        bootstrap_servers = options.get("bootstrap") or config(
            "KAFKA_BOOTSTRAP_SERVERS", default="localhost:9092"
        )
        group_id = options["group_id"]
        batch_size = options["batch_size"]

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
                f"Consuming from Kafka topics {topics} on {bootstrap_servers} "
                f"(batch_size={batch_size})"
            )
        )

        flow_batch: list[dict] = []
        alert_batch: list[dict] = []
        last_flush = time.monotonic()

        try:
            while True:
                msg = consumer.poll(0.5)

                if msg is not None and not msg.error():
                    try:
                        payload = json.loads(msg.value().decode("utf-8"))
                    except Exception as exc:
                        self.stderr.write(f"Failed to decode Kafka message: {exc}")
                        payload = None

                    if payload is not None:
                        topic = msg.topic()
                        if topic == "network_flows":
                            flow_batch.append(payload)
                        elif topic == "security_alerts":
                            alert_batch.append(payload)
                elif msg is not None and msg.error():
                    self.stderr.write(f"Kafka error: {msg.error()}")

                batch_full = (len(flow_batch) + len(alert_batch)) >= batch_size
                timed_out = (time.monotonic() - last_flush) >= BATCH_TIMEOUT_SECS
                has_data = flow_batch or alert_batch

                if has_data and (batch_full or timed_out):
                    self._flush_batches(flow_batch, alert_batch)
                    flow_batch.clear()
                    alert_batch.clear()
                    last_flush = time.monotonic()

        except KeyboardInterrupt:
            self.stdout.write("Stopping Kafka consumer...")
        finally:
            if flow_batch or alert_batch:
                self._flush_batches(flow_batch, alert_batch)
            consumer.close()

    def _flush_batches(
        self, flows: list[dict], alerts: list[dict]
    ) -> None:
        channel_layer = get_channel_layer()

        if flows:
            objects = [self._flow_to_model(d) for d in flows]
            try:
                NetworkTraffic.objects.bulk_create(objects, ignore_conflicts=True)
            except Exception as exc:
                self.stderr.write(f"Failed to bulk_create NetworkTraffic: {exc}")

            try:
                async_to_sync(channel_layer.group_send)(
                    "network_updates",
                    {
                        "type": "network_update",
                        "data": {
                            "event": "batch_update",
                            "count": len(flows),
                            "timestamp": str(timezone.now()),
                        },
                    },
                )
            except Exception as ws_exc:
                logger.warning("WS push (network) failed: %s", ws_exc)

        if alerts:
            objects = [self._alert_to_model(d) for d in alerts]
            try:
                SecurityAlert.objects.bulk_create(objects, ignore_conflicts=True)
            except Exception as exc:
                self.stderr.write(f"Failed to bulk_create SecurityAlert: {exc}")

            try:
                async_to_sync(channel_layer.group_send)(
                    "alert_updates",
                    {
                        "type": "alert_notification",
                        "data": {
                            "event": "batch_alerts",
                            "count": len(alerts),
                            "alerts": [
                                {
                                    "title": d.get("alert", {}).get("signature", "Alert"),
                                    "severity": self._map_severity(
                                        d.get("alert", {}).get("severity")
                                    ),
                                    "source_ip": d.get("source_ip"),
                                }
                                for d in alerts[:10]
                            ],
                            "timestamp": str(timezone.now()),
                        },
                    },
                )
            except Exception as ws_exc:
                logger.warning("WS push (alerts) failed: %s", ws_exc)

        total = len(flows) + len(alerts)
        if total:
            self.stdout.write(f"  Flushed {len(flows)} flows + {len(alerts)} alerts")

    def _flow_to_model(self, data: dict) -> NetworkTraffic:
        return NetworkTraffic(
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

    def _alert_to_model(self, data: dict) -> SecurityAlert:
        alert = data.get("alert", {})
        category = alert.get("category", "")
        alert_type = self.CATEGORY_TO_TYPE.get(category, "intrusion")

        return SecurityAlert(
            title=alert.get("signature", "Security Alert"),
            description=category or "N/A",
            severity=self._map_severity(alert.get("severity")),
            alert_type=alert_type,
            status="new",
            source_ip=data.get("source_ip"),
            destination_ip=data.get("destination_ip"),
            source_port=data.get("source_port"),
            destination_port=data.get("destination_port"),
            protocol=data.get("proto"),
            signature=alert.get("signature"),
            rule_id=str(alert.get("signature_id", "")),
            country_code=data.get("geoip", {}).get("country_code2"),
            timestamp=data.get("@timestamp", timezone.now()),
        )

    @staticmethod
    def _map_severity(suricata_severity) -> str:
        if suricata_severity is None:
            return "medium"
        try:
            level = int(suricata_severity)
        except (TypeError, ValueError):
            return "medium"
        if level == 1:
            return "critical"
        if level == 2:
            return "high"
        if level == 3:
            return "medium"
        return "low"
