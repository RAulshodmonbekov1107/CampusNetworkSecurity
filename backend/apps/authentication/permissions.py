from rest_framework.permissions import BasePermission


def _is_admin(user) -> bool:
    """True for users with role='admin' OR Django superusers."""
    return bool(
        user
        and user.is_authenticated
        and (getattr(user, "role", None) == "admin" or getattr(user, "is_superuser", False))
    )


class IsAdminRole(BasePermission):
    """Allow access only to users with the 'admin' role or Django superusers."""

    def has_permission(self, request, view):
        return _is_admin(request.user)


class IsAnalystOrAdmin(BasePermission):
    """Allow access to users with 'analyst' or 'admin' role (or superusers)."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                getattr(request.user, "role", None) in ("admin", "analyst")
                or getattr(request.user, "is_superuser", False)
            )
        )
