"""Mint bridge tokens for tests, matching api.authentication.BridgeTokenAuthentication."""
import base64
import hashlib
import hmac
import json
import time

from django.conf import settings


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def make_bridge_token(role: str = "admin", sub: str = "test-user", ttl: int = 300) -> str:
    payload = {"sub": sub, "role": role, "exp": time.time() + ttl}
    payload_b64 = _b64url(json.dumps(payload).encode("utf-8"))
    sig = hmac.new(settings.BACKEND_AUTH_SECRET.encode("utf-8"),
                    payload_b64.encode("ascii"), hashlib.sha256).digest()
    return f"{payload_b64}.{_b64url(sig)}"


def auth_header(role: str = "admin", sub: str = "test-user") -> str:
    return f"Bearer {make_bridge_token(role, sub)}"
