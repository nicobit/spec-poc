import json
import sys
from pathlib import Path
from unittest.mock import patch, AsyncMock, MagicMock

from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def _make_msg(content: str, tool_calls=None):
    msg = MagicMock()
    msg.tool_calls = tool_calls or None
    msg.content = content
    return msg


def test_ai_handler_preserves_allowlist(monkeypatch):
    monkeypatch.setenv("AI_REDACTION_ALLOWLIST", "keep@safe.com")
    monkeypatch.setenv("AI_REDACTION_MAX_LEN", "4000")

    with patch("app.services.secret_service.SecretService.get_secret_value", return_value="test-secret"):
        import function_ai_chat.__init__ as ai_module

    fake_resp = json.dumps({"answer": "ok", "remediation": ["step1"], "references": []})
    fake_msg = _make_msg(fake_resp)

    with patch("app.services.llm.openai_service.OpenAIService.chat_with_tools", return_value=fake_msg):
        ai_module.get_current_user = AsyncMock(return_value={"oid": "user-1", "roles": ["Reader"]})

        with TestClient(ai_module.fast_app) as client:
            payload = {"message": "Why? keep@safe.com"}
            r = client.post("/api/ai/chat", json=payload, headers={"Authorization": "Bearer x"})

    assert r.status_code == 200
    body = r.json()
    assert "answer" in body
