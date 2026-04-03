import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from function_ai_chat.redaction import redact_text, Redactor


def test_redact_email_and_guid_and_ip():
    inp = "Contact me at alice@example.com. Trace id: 3f2504e0-4f89-11d3-9a0c-0305e82c3301. Node 192.168.0.1"
    out = redact_text(inp)
    assert "<redacted>" in out
    assert "alice@example.com" not in out


def test_allowlist_preserves_items():
    r = Redactor(allowlist=["keep@safe.com"])
    inp = "Please contact keep@safe.com and also bob@unsafe.com"
    out = r.redact(inp)
    assert "keep@safe.com" in out
    assert "bob@unsafe.com" not in out


def test_truncation():
    long = "x" * 10000
    out = redact_text(long)
    assert "<output-truncated>" in out
