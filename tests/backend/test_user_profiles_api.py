from fastapi.testclient import TestClient

from backend.function_user_profiles.app.app import fast_app


client = TestClient(fast_app)


def test_user_profiles_favorites_crud(monkeypatch):
    async def _fake_user(req):
        return {"preferred_username": "api-tester"}

    # patch get_current_user used by the routes
    import backend.function_user_profiles.app.app as appmod

    appmod.get_current_user = _fake_user

    # start with empty favorites
    r = client.get("/api/users/me/env-favorites")
    assert r.status_code == 200
    assert r.json().get("favorites") == []

    # replace favorites via PUT
    r2 = client.put("/api/users/me/env-favorites", json={"favorites": ["env-1", "env-2"]})
    assert r2.status_code == 200
    assert r2.json().get("favorites") == ["env-1", "env-2"]

    # add a favorite via POST
    r3 = client.post("/api/users/me/env-favorites", json={"id": "env-3"})
    assert r3.status_code in (200, 201)
    assert "env-3" in client.get("/api/users/me/env-favorites").json().get("favorites")

    # delete a favorite
    r4 = client.delete("/api/users/me/env-favorites/env-2")
    assert r4.status_code in (200, 204)
    assert "env-2" not in client.get("/api/users/me/env-favorites").json().get("favorites")
