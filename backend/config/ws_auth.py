"""
JWT authentication middleware for Django Channels WebSocket connections.

The frontend uses JWT (no session cookies), so the default
``AuthMiddlewareStack`` cannot authenticate WebSocket connections.

Clients should connect with the token in the query string::

    ws://host:8000/ws/alerts/?token=<access_token>

If the token is valid the corresponding user is attached to ``scope["user"]``.
Invalid or missing tokens fall back to ``AnonymousUser`` — the consumer can
then decide whether to accept or reject the connection.
"""

import logging
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)


@database_sync_to_async
def _get_user_from_token(token_str: str):
    """Validate a JWT access token and return the associated user."""
    try:
        from rest_framework_simplejwt.tokens import AccessToken

        access = AccessToken(token_str)
        user_id = access["user_id"]

        from django.contrib.auth import get_user_model
        User = get_user_model()
        return User.objects.get(pk=user_id)
    except Exception:
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """Extract a JWT from ``?token=`` query-string and populate ``scope["user"]``."""

    async def __call__(self, scope, receive, send):
        qs = parse_qs(scope.get("query_string", b"").decode("utf-8"))
        token_list = qs.get("token", [])

        if token_list:
            scope["user"] = await _get_user_from_token(token_list[0])
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)
