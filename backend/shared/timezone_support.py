from __future__ import annotations

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
