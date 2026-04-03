import json
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


class AiChatHttpTests(unittest.TestCase):
    def _import_ai_module(self):
        # Import module freshly and patch secrets/OpenAI client if needed
        with patch("app.services.secret_service.SecretService.get_secret_value", return_value="test-secret"):
            import function_ai_chat.__init__ as ai_module

        return ai_module

    def test_ai_chat_requires_authentication(self):
        ai_module = self._import_ai_module()

        with TestClient(ai_module.fast_app) as client:
            response = client.post("/api/ai/chat", json={"message": "Why did schedule X fail?"})

        # should be unauthorized without auth
        self.assertIn(response.status_code, (401, 422))

    def test_ai_chat_returns_structured_response_for_authenticated_user(self):
        ai_module = self._import_ai_module()

        async def fake_user(_req=None):
            return {"oid": "user-1", "roles": ["Reader"]}

        # Mock OpenAIService.chat to return JSON string
        fake_ai_resp = json.dumps({
            "answer": "The schedule failed due to a timeout.",
            "remediation": ["Investigate network connectivity", "Retry the schedule"],
            "references": [{"type": "execution", "id": "exec-1", "snippet": "timeout"}],
        })

        ai_module.get_current_user = AsyncMock(return_value={"oid": "user-1", "roles": ["Reader"]})

        with patch("app.services.llm.openai_service.OpenAIService.chat", return_value=fake_ai_resp):
            with TestClient(ai_module.fast_app) as client:
                response = client.post(
                    "/api/ai/chat",
                    json={"message": "Why did schedule X fail?", "filters": {"scheduleId": "sched-1"}},
                    headers={"Authorization": "Bearer test-token"},
                )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("answer", body)
        self.assertIn("remediation", body)
        self.assertIn("references", body)


if __name__ == "__main__":
    unittest.main()
