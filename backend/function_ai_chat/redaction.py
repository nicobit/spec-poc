import os
import re
from typing import Iterable, List


class Redactor:
    def __init__(self, allowlist: Iterable[str] | None = None):
        env_allow = os.getenv("AI_REDACTION_ALLOWLIST")
        allow = set([a.strip() for a in env_allow.split(",") if a.strip()]) if env_allow else set()
        if allowlist:
            allow.update([a for a in allowlist if a])
        self.allowlist = allow

        # compile patterns once
        self.patterns = [
            re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"),
            re.compile(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"),
            re.compile(r"\b(tok|secret)[-_][A-Za-z0-9]+\b"),
            re.compile(r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b"),
            re.compile(r"\+?\d[\d\s().-]{7,}\d"),
            re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
            re.compile(r"\b\d{13,19}\b"),
        ]

    def _is_allowed(self, match: str) -> bool:
        return match in self.allowlist

    def redact(self, text: str) -> str:
        if not text:
            return text

        # Protect allowlist items by temporary placeholders
        placeholders: List[tuple[str, str]] = []
        for i, item in enumerate(self.allowlist):
            if item and item in text:
                placeholder = f"__ALLOW_{i}__"
                text = text.replace(item, placeholder)
                placeholders.append((placeholder, item))

        # Apply patterns
        for p in self.patterns:
            text = p.sub("<redacted>", text)

        # Restore allowlist items
        for placeholder, orig in placeholders:
            text = text.replace(placeholder, orig)

        # truncate long text to avoid token bloat
        max_len = int(os.getenv("AI_REDACTION_MAX_LEN", "4000"))
        if len(text) > max_len:
            text = text[:max_len] + "\n\n<output-truncated>"

        return text


def redact_text(text: str, allowlist: Iterable[str] | None = None) -> str:
    r = Redactor(allowlist=allowlist)
    return r.redact(text)
