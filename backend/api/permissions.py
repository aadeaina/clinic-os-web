from rest_framework.permissions import BasePermission

STAFF_ROLES = {"admin", "doctor", "billing", "nurse", "front_desk"}


class IsStaff(BasePermission):
    """Requires a bridge token minted for one of the clinic staff roles."""

    def has_permission(self, request, view):
        principal = request.user
        return bool(principal and getattr(principal, "role", None) in STAFF_ROLES)
