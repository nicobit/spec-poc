import backend.function_environment.__init__ as fe
from fastapi.testclient import TestClient

client = TestClient(fe.fast_app)


def _fake_client_admin(req):
    return {"roles": ["client-admin"], "client": "client-a", "preferred_username": "ca@example.com"}


def test_put_environment_client_admin_allowed():
    # ensure there's an existing env in in-memory store
    # monkeypatch get_current_user
    fe.get_current_user = _fake_client_admin
    # pick existing env id env-1 from environment_store
    payload = {"name": "dev-1-renamed"}
    r = client.put("/api/environments/env-1", json=payload)
    assert r.status_code in (200, 201)
    data = r.json()
    assert data.get("updated") is not None
