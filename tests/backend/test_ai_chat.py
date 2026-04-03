import json
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def _make_tool_response(content: str, tool_calls=None):
    """Build a mock message object returned by chat_with_tools."""
    msg = MagicMock()
    msg.tool_calls = tool_calls or None
    msg.content = content
    return msg


class AiChatHttpTests(unittest.TestCase):
    def _import_ai_module(self):
        with patch("app.services.secret_service.SecretService.get_secret_value", return_value="test-secret"):
            import function_ai_chat.__init__ as ai_module
        return ai_module

    def test_ai_chat_requires_authentication(self):
        ai_module = self._import_ai_module()

        with TestClient(ai_module.fast_app) as client:
            response = client.post("/api/ai/chat", json={"message": "Why did schedule X fail?"})

        self.assertIn(response.status_code, (401, 422))

    def test_ai_chat_returns_structured_response_for_authenticated_user(self):
        ai_module = self._import_ai_module()

        ai_module.get_current_user = AsyncMock(return_value={"oid": "user-1", "roles": ["Reader"]})

        fake_resp = json.dumps({
            "answer": "The schedule failed due to a timeout.",
            "remediation": ["Investigate network connectivity", "Retry the schedule"],
            "references": [{"type": "execution", "id": "exec-1", "snippet": "timeout"}],
        })
        mock_msg = _make_tool_response(fake_resp)

        with patch("app.services.llm.openai_service.OpenAIService.chat_with_tools", return_value=mock_msg):
            with TestClient(ai_module.fast_app) as client:
                response = client.post(
                    "/api/ai/chat",
                    json={"message": "Why did schedule X fail?"},
                    headers={"Authorization": "Bearer test-token"},
                )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("answer", body)
        self.assertIn("remediation", body)
        self.assertIn("references", body)

    def test_ai_chat_works_without_filters(self):
        """No IDs required — catalog is always injected."""
        ai_module = self._import_ai_module()

        ai_module.get_current_user = AsyncMock(return_value={"oid": "user-1", "roles": ["Reader"]})

        fake_resp = json.dumps({"answer": "No failures found.", "remediation": [], "references": []})
        mock_msg = _make_tool_response(fake_resp)

        with patch("app.services.llm.openai_service.OpenAIService.chat_with_tools", return_value=mock_msg):
            with TestClient(ai_module.fast_app) as client:
                response = client.post(
                    "/api/ai/chat",
                    json={"message": "Are there any failing schedules?"},
                    headers={"Authorization": "Bearer test-token"},
                )

        self.assertEqual(response.status_code, 200)
        self.assertIn("answer", response.json())


if __name__ == "__main__":
    unittest.main()
