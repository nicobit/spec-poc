import json
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

import backend.function_ai_chat.__init__ as ai_mod


def _make_msg(content: str, tool_calls=None):
    msg = MagicMock()
    msg.tool_calls = tool_calls or None
    msg.content = content
    return msg


def make_client(monkeypatch):
    async def _fake_user(req):
        return {"roles": ["admin"], "preferred_username": "test"}

    monkeypatch.setattr(ai_mod, "get_current_user", _fake_user)

    fake_resp = json.dumps({"answer": "All good", "remediation": [], "references": []})
    monkeypatch.setattr(
        ai_mod.OpenAIService,
        "chat_with_tools",
        staticmethod(lambda messages, tools, max_tokens=800, temperature=0: _make_msg(fake_resp)),
    )
    return TestClient(ai_mod.fast_app)


def test_ai_chat_endpoint_returns_answer(monkeypatch):
    client = make_client(monkeypatch)

    resp = client.post("/api/ai/chat", json={
        "message": "Give me recent failures",
    })

    assert resp.status_code == 200
    body = resp.json()
    assert body.get("answer") == "All good"


def test_ai_chat_endpoint_works_without_any_filters(monkeypatch):
    client = make_client(monkeypatch)

    resp = client.post("/api/ai/chat", json={"message": "How many clients are there?"})

    assert resp.status_code == 200
    assert "answer" in resp.json()
