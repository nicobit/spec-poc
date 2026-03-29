from __future__ import annotations

from datetime import timezone
from zoneinfo import ZoneInfo


FALLBACK_IANA_TIMEZONES = {
    "Africa/Abidjan",
    "Africa/Johannesburg",
    "America/Chicago",
    "America/Los_Angeles",
    "America/New_York",
    "America/Sao_Paulo",
    "Asia/Dubai",
    "Asia/Hong_Kong",
    "Asia/Singapore",
    "Asia/Tokyo",
    "Australia/Sydney",
    "Europe/Amsterdam",
    "Europe/Berlin",
    "Europe/London",
    "Europe/Madrid",
    "Europe/Paris",
    "Europe/Rome",
    "Europe/Zurich",
    "UTC",
}


def is_valid_iana_timezone(value: str) -> bool:
    normalized = str(value or "").strip()
    if not normalized:
        return False
    try:
        ZoneInfo(normalized)
        return True
    except Exception:
        return normalized in FALLBACK_IANA_TIMEZONES


def get_timezone_info(value: str):
    normalized = str(value or "").strip()
    if not normalized:
        raise ValueError("timezone is required")
    try:
        return ZoneInfo(normalized)
    except Exception:
        if normalized == "UTC":
            return timezone.utc
        if normalized in FALLBACK_IANA_TIMEZONES:
            return ZoneInfo("UTC")
        raise
