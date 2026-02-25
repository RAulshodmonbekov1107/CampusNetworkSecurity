"""
ASGI config for Campus Network Security Monitoring System.
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

django_asgi_app = get_asgi_application()

from config import routing

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(
            routing.websocket_urlpatterns
        )
    ),
})

# Start the Kafka -> WebSocket bridge in a background thread so that
# high-severity Suricata alerts are pushed in real time.
try:
    from apps.dashboard.consumers import start_kafka_alert_bridge
    start_kafka_alert_bridge()
except Exception:
    pass
