import hashlib
import hmac
import time

from app.config import settings


def validate_token(token: str) -> bool:
    if not settings.internal_api_key:
        return True  # local dev
    parts = token.split(".")
    if len(parts) != 2:
        return False
    expiry, sig = parts
    try:
        if int(expiry) < int(time.time()):
            return False
    except ValueError:
        return False
    expected = hmac.new(
        settings.internal_api_key.encode(), expiry.encode(), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, sig)
