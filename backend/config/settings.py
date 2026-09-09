import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent

DEBUG = os.environ.get("DJANGO_DEBUG", "0") == "1"

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "")
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = "dev-only-change-me"
    else:
        raise RuntimeError(
            "DJANGO_SECRET_KEY must be set when DJANGO_DEBUG is not enabled.")

# The shared secret used to verify short-lived bridge tokens minted by the Next.js
# frontend (see web/lib/backend-token.ts). Without it every API request is rejected.
BACKEND_AUTH_SECRET = os.environ.get("BACKEND_AUTH_SECRET", "")
if not BACKEND_AUTH_SECRET and not DEBUG:
    raise RuntimeError(
        "BACKEND_AUTH_SECRET must be set when DJANGO_DEBUG is not enabled.")
BACKEND_AUTH_SECRET = BACKEND_AUTH_SECRET or "dev-only-change-me"

_allowed_hosts = os.environ.get("DJANGO_ALLOWED_HOSTS", "")
ALLOWED_HOSTS = [h.strip() for h in _allowed_hosts.split(",") if h.strip()]
if not ALLOWED_HOSTS:
    if DEBUG:
        ALLOWED_HOSTS = ["localhost", "127.0.0.1"]
    else:
        raise RuntimeError(
            "DJANGO_ALLOWED_HOSTS must be set when DJANGO_DEBUG is not enabled.")

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "rest_framework",
    "corsheaders",
    "core",
    "api",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
]

# In DEBUG only, allow any origin for local frontend development. In production, only
# the origins explicitly listed in CORS_ALLOWED_ORIGINS (comma-separated env var) may
# call this API cross-origin.
CORS_ALLOW_ALL_ORIGINS = DEBUG
_cors_origins = os.environ.get("CORS_ALLOWED_ORIGINS", "")
CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins.split(",") if o.strip()]

if not DEBUG:
    SECURE_SSL_REDIRECT = os.environ.get("DJANGO_SECURE_SSL_REDIRECT", "1") == "1"
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["api.authentication.BridgeTokenAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = True
