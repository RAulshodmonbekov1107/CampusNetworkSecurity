import json
import logging

from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)


class NetworkLiveConsumer(AsyncWebsocketConsumer):
    """Streams every network event (flows, device changes, stats) live to the dashboard."""

    GROUP = "network_live"

    async def connect(self):
        await self.accept()
        await self.channel_layer.group_add(self.GROUP, self.channel_name)
        # Send a welcome ping so the frontend knows it's connected
        await self.send(text_data=json.dumps({"type": "connected"}))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.GROUP, self.channel_name)

    async def receive(self, text_data):
        pass

    async def network_event(self, event):
        await self.send(text_data=json.dumps(event["data"]))


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

    Alerts are pushed by the ``consume_kafka`` management command after
    each batch flush.
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
