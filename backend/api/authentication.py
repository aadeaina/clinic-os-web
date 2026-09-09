"""Authentication for the bridge token minted by the Next.js frontend.

Django has no user accounts of its own — staff/patient identity and roles live in the
Next.js app (web/lib/auth.ts), gated behind an httpOnly session cookie. When the
frontend needs to call this API directly from the browser (dataSource: "real"), it
first exchanges that cookie for a short-lived token at /api/backend-token (see
web/app/api/backend-token/route.ts), signed with the same BACKEND_AUTH_SECRET
configured here. This class verifies that signature and expiry and exposes the
embedded role so views can enforce role-based permissions.

This is deliberately not a general-purpose auth system: it only proves "a Next.js
server holding BACKEND_AUTH_SECRET vouched for this role a few minutes ago."
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from dataclasses import dataclass

from django.conf import settings
from rest_framework import authentication, exceptions


@dataclass
class BridgePrincipal:
    """Stand-in for request.user — Django has no User model backing this."""
    sub: str
    role: str

    @property
    def is_authenticated(self) -> bool:
        return True


def _b64url_decode(s: str) -> bytes:
    padding = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + padding)


def verify_bridge_token(token: str) -> BridgePrincipal | None:
    try:
        payload_b64, sig_b64 = token.split(".", 1)
        expected_sig = hmac.new(
            settings.BACKEND_AUTH_SECRET.encode("utf-8"),
            payload_b64.encode("ascii"),
            hashlib.sha256,
        ).digest()
        if not hmac.compare_digest(expected_sig, _b64url_decode(sig_b64)):
            return None
        payload = json.loads(_b64url_decode(payload_b64))
        if payload.get("exp", 0) < time.time():
            return None
        return BridgePrincipal(sub=payload["sub"], role=payload["role"])
    except Exception:
        return None


class BridgeTokenAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        header = authentication.get_authorization_header(request).decode("latin-1")
        if not header or not header.lower().startswith("bearer "):
            return None

        token = header[7:].strip()
        principal = verify_bridge_token(token)
        if principal is None:
            raise exceptions.AuthenticationFailed("Invalid or expired bridge token.")
        return (principal, token)

    def authenticate_header(self, request):
        return "Bearer"
