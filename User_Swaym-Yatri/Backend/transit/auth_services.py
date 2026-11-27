import hashlib
import hmac
import logging
import secrets
import time
from math import ceil

from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

OTP_TTL_SECONDS = 60
OTP_REQUEST_WINDOW_SECONDS = 600
OTP_REQUEST_LIMIT_PER_PHONE = 3
OTP_REQUEST_LIMIT_PER_IP = 5
OTP_ATTEMPT_LIMIT = 5


def _phone_digest(phone_number):
    return hashlib.sha256(phone_number.encode()).hexdigest()


def _otp_digest(phone_number, code):
    return hmac.new(
        settings.SECRET_KEY.encode(),
        f"{phone_number}:{code}".encode(),
        hashlib.sha256,
    ).hexdigest()


def _increment_within_limit(key, limit):
    if cache.add(key, 1, timeout=OTP_REQUEST_WINDOW_SECONDS):
        return True
    try:
        return cache.incr(key) <= limit
    except ValueError:
        return cache.add(key, 1, timeout=OTP_REQUEST_WINDOW_SECONDS)


def _mask_phone(phone_number):
    return f"{phone_number[:3]}{'*' * (len(phone_number) - 5)}{phone_number[-2:]}"


def issue_console_otp(phone_number, client_ip):
    if not settings.DEBUG:
        return {"detail": "Phone sign-in is unavailable until SMS delivery is configured."}, 503

    phone_digest = _phone_digest(phone_number)
    ip_digest = hashlib.sha256((client_ip or "unknown").encode()).hexdigest()
    if not _increment_within_limit(f"otp:request:ip:{ip_digest}", OTP_REQUEST_LIMIT_PER_IP):
        return {"detail": "Too many code requests. Try again later."}, 429
    if not _increment_within_limit(
        f"otp:request:phone:{phone_digest}",
        OTP_REQUEST_LIMIT_PER_PHONE,
    ):
        return {"detail": "Too many code requests. Try again later."}, 429

    code = f"{secrets.randbelow(1_000_000):06d}"
    expires_at = time.time() + OTP_TTL_SECONDS
    cache.set(
        f"otp:challenge:{phone_digest}",
        {
            "code_digest": _otp_digest(phone_number, code),
            "attempts": 0,
            "expires_at": expires_at,
        },
        timeout=OTP_TTL_SECONDS,
    )
    logger.warning("Development OTP for %s: %s", _mask_phone(phone_number), code)
    return {"delivery_mode": "console", "expires_in": OTP_TTL_SECONDS}, 200


def verify_console_otp(phone_number, code):
    if not settings.DEBUG:
        return {"detail": "Phone sign-in is unavailable until SMS delivery is configured."}, 503

    key = f"otp:challenge:{_phone_digest(phone_number)}"
    challenge = cache.get(key)
    if challenge is None or challenge["expires_at"] <= time.time():
        cache.delete(key)
        return {"detail": "Code expired. Request a new one."}, 400

    expected = challenge["code_digest"]
    if not hmac.compare_digest(expected, _otp_digest(phone_number, code)):
        challenge["attempts"] += 1
        if challenge["attempts"] >= OTP_ATTEMPT_LIMIT:
            cache.delete(key)
            return {"detail": "Too many incorrect codes. Request a new one."}, 429
        cache.set(
            key,
            challenge,
            timeout=max(1, ceil(challenge["expires_at"] - time.time())),
        )
        return {"detail": "Incorrect code."}, 400

    cache.delete(key)
    return {"phone_digest": _phone_digest(phone_number)}, 200
