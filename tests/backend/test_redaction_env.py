import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from function_ai_chat.redaction import redact_text, Redactor


def test_env_allowlist_preserves_item(tmp_path, monkeypatch):
    monkeypatch.setenv("AI_REDACTION_ALLOWLIST", "keep@safe.com")
    inp = "Please contact keep@safe.com and remove other@unsafe.com"
    out = redact_text(inp)
    assert "keep@safe.com" in out
    assert "other@unsafe.com" not in out


def test_env_max_len_truncation(monkeypatch):
    monkeypatch.setenv("AI_REDACTION_MAX_LEN", "50")
    long = "a" * 200
    out = redact_text(long)
    assert "<output-truncated>" in out
