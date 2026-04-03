from fastapi.testclient import TestClient

import backend.function_ai_chat.__init__ as ai_mod


def make_client(monkeypatch):
    # bypass auth (async)
    async def _fake_user(req):
        return {"roles": ["admin"], "preferred_username": "test"}

    monkeypatch.setattr(ai_mod, "get_current_user", _fake_user)
    # mock OpenAIService.chat to return predictable JSON
    monkeypatch.setattr(ai_mod.OpenAIService, "chat", staticmethod(lambda messages, temperature=0, max_tokens=800: '{"answer": "All good"}'))
    return TestClient(ai_mod.fast_app)


def test_ai_chat_endpoint_returns_answer(monkeypatch):
    client = make_client(monkeypatch)

    resp = client.post("/api/ai/chat", json={
        "message": "Give me recent failures",
        "filters": {"environmentName": "dev-1"}
    })

    assert resp.status_code == 200
    body = resp.json()
    assert body.get("answer") == "All good"
