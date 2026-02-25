import json
import logging
import threading

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from decouple import config

logger = logging.getLogger(__name__)


class DashboardConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for dashboard real-time updates."""

    async def connect(self):
        await self.accept()
        await self.channel_layer.group_add("dashboard_updates", self.channel_name)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("dashboard_updates", self.channel_name)

    async def receive(self, text_data):
        pass

    async def dashboard_update(self, event):
        await self.send(text_data=json.dumps(event["data"]))


class AlertConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for alert notifications.

    High-severity Suricata alerts pushed here in real time via the
    Kafka bridge (see ``start_kafka_alert_bridge``).
    """

    async def connect(self):
        await self.accept()
        await self.channel_layer.group_add("alert_updates", self.channel_name)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("alert_updates", self.channel_name)

    async def receive(self, text_data):
        pass

    async def alert_notification(self, event):
        await self.send(text_data=json.dumps(event["data"]))


class NetworkConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for network traffic updates."""

    async def connect(self):
        await self.accept()
        await self.channel_layer.group_add("network_updates", self.channel_name)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("network_updates", self.channel_name)

    async def network_update(self, event):
        await self.send(text_data=json.dumps(event["data"]))


# ---------------------------------------------------------------------------
# Kafka -> Channel Layer bridge (runs in a background thread)
# ---------------------------------------------------------------------------

_kafka_bridge_started = False
_bridge_lock = threading.Lock()


def _severity_label(numeric_severity) -> str:
    """Map Suricata numeric severity to our string labels."""
    try:
        level = int(numeric_severity)
    except (TypeError, ValueError):
        return "medium"
    if level == 1:
        return "critical"
    if level == 2:
        return "high"
    if level == 3:
        return "medium"
    return "low"


def _kafka_alert_loop():
    """Long-running loop that consumes ``security_alerts`` from Kafka and
    pushes high/critical alerts to the ``alert_updates`` channel group."""
    try:
        from confluent_kafka import Consumer
    except ImportError:
        logger.warning("confluent-kafka not installed; Kafka alert bridge disabled.")
        return

    bootstrap = config("KAFKA_BOOTSTRAP_SERVERS", default="localhost:9092")
    consumer_conf = {
        "bootstrap.servers": bootstrap,
        "group.id": "ws-alert-bridge",
        "auto.offset.reset": "latest",
    }

    consumer = Consumer(consumer_conf)
    consumer.subscribe(["security_alerts"])
    logger.info("Kafka alert bridge started on %s", bootstrap)

    channel_layer = get_channel_layer()

    try:
        while True:
            msg = consumer.poll(1.0)
            if msg is None:
                continue
            if msg.error():
                logger.error("Kafka bridge error: %s", msg.error())
                continue

            try:
                payload = json.loads(msg.value().decode("utf-8"))
            except Exception:
                continue

            alert_info = payload.get("alert", {})
            severity = _severity_label(alert_info.get("severity"))

            if severity in ("high", "critical"):
                notification = {
                    "type": "alert_notification",
                    "data": {
                        "event": "new_alert",
                        "severity": severity,
                        "title": alert_info.get("signature", "Security Alert"),
                        "category": alert_info.get("category", ""),
                        "source_ip": payload.get("source_ip"),
                        "destination_ip": payload.get("destination_ip"),
                        "timestamp": payload.get("@timestamp"),
                    },
                }
                try:
                    async_to_sync(channel_layer.group_send)("alert_updates", notification)
                except Exception as exc:
                    logger.error("Failed to push alert to channel layer: %s", exc)
    except Exception:
        logger.exception("Kafka alert bridge crashed")
    finally:
        consumer.close()


def start_kafka_alert_bridge():
    """Start the Kafka bridge thread exactly once."""
    global _kafka_bridge_started
    with _bridge_lock:
        if _kafka_bridge_started:
            return
        _kafka_bridge_started = True
    t = threading.Thread(target=_kafka_alert_loop, daemon=True)
    t.start()
