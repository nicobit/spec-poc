from fastapi.testclient import TestClient
from backend.function_environment.__init__ import fast_app


client = TestClient(fast_app)


def test_list_environments_ok():
    r = client.get("/api/environments")
    assert r.status_code == 200
    data = r.json()
    assert "environments" in data
    # basic filtering and pagination
    r2 = client.get("/api/environments?client=client-a&page=0&per_page=1")
    assert r2.status_code == 200
    d2 = r2.json()
    assert "environments" in d2 and isinstance(d2.get("total"), int)
    assert all(e.get("client") == "client-a" for e in d2.get("environments", []))


def test_list_schedules_ok():
    r = client.get("/api/environments/schedules")
    assert r.status_code == 200
    data = r.json()
    assert "schedules" in data


def test_create_environment_conflict():
    # create same (client,name) should return 409 when attempted via POST
    import backend.function_environment.__init__ as fe

    async def _fake_user(req):
        return {"roles": ["admin"], "preferred_username": "test"}

    # monkeypatch the auth helper used by the routes
    fe.get_current_user = _fake_user

    payload = {"client": "client-a", "name": "dev-1"}
    r1 = client.post("/api/environments", json=payload)
    # first create should succeed (201 or 200 depending on handler)
    assert r1.status_code in (200, 201)
    r2 = client.post("/api/environments", json=payload)
    # second create must return conflict 409
    assert r2.status_code == 409
