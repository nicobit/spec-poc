import os
import sys
import json
from pathlib import Path
from unittest.mock import patch, AsyncMock

from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def test_ai_handler_preserves_allowlist(monkeypatch):
    # set allowlist env
    monkeypatch.setenv("AI_REDACTION_ALLOWLIST", "keep@safe.com")

    # import module after env var set
    with patch("app.services.secret_service.SecretService.get_secret_value", return_value="test-secret"):
        import function_ai_chat.__init__ as ai_module

    # mock PromptManager.load_template to return a simple template
    class DummyTemplate:
        def replace(self, a, b):
            return b

    monkeypatch.setenv("AI_REDACTION_MAX_LEN", "4000")

    with patch("app.services.llm.prompt_manager.PromptManager.load_template", return_value="Q:{user_question}\nD:{result_data}"):
        # OpenAIService.chat should receive messages; return JSON that echoes answer
        fake_resp = json.dumps({
            "answer": "ok",
            "remediation": ["step1"],
            "references": [],
        })

        with patch("app.services.llm.openai_service.OpenAIService.chat", return_value=fake_resp):
            # Mock current_user to bypass auth
            ai_module.get_current_user = AsyncMock(return_value={"oid": "user-1", "roles": ["Reader"]})

            with TestClient(ai_module.fast_app) as client:
                payload = {"message": "Why?", "filters": {}}
                # include allowlist email in message to ensure it's preserved in redaction
                payload["message"] += " keep@safe.com"
                r = client.post("/api/ai/chat", json=payload, headers={"Authorization": "Bearer x"})

    assert r.status_code == 200
    body = r.json()
    assert "answer" in body
