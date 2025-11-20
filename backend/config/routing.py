"""
WebSocket routing configuration.
"""
from django.urls import path
from apps.dashboard import consumers

websocket_urlpatterns = [
    path('ws/dashboard/', consumers.DashboardConsumer.as_asgi()),
    path('ws/alerts/', consumers.AlertConsumer.as_asgi()),
    path('ws/network/', consumers.NetworkConsumer.as_asgi()),
]

