import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from datetime import timedelta
from apps.network.models import NetworkTraffic
from apps.alerts.models import SecurityAlert


class DashboardConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for dashboard real-time updates."""
    
    async def connect(self):
        await self.accept()
        await self.channel_layer.group_add("dashboard_updates", self.channel_name)
    
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("dashboard_updates", self.channel_name)
    
    async def receive(self, text_data):
        # Handle incoming messages if needed
        pass
    
    async def dashboard_update(self, event):
        """Send dashboard update to WebSocket."""
        await self.send(text_data=json.dumps(event['data']))


class AlertConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for alert notifications."""
    
    async def connect(self):
        await self.accept()
        await self.channel_layer.group_add("alert_updates", self.channel_name)
    
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("alert_updates", self.channel_name)
    
    async def alert_notification(self, event):
        """Send alert notification to WebSocket."""
        await self.send(text_data=json.dumps(event['data']))


class NetworkConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for network traffic updates."""
    
    async def connect(self):
        await self.accept()
        await self.channel_layer.group_add("network_updates", self.channel_name)
    
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("network_updates", self.channel_name)
    
    async def network_update(self, event):
        """Send network update to WebSocket."""
        await self.send(text_data=json.dumps(event['data']))

