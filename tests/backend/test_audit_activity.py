import os
import json
import time
from fastapi.testclient import TestClient

from shared import audit_store
import backend.function_environment.__init__ as env_mod


def setup_function(fn):
    # ensure we use JSON fallback for tests
    os.environ.pop("AZURE_TABLES_CONNECTION_STRING", None)
    if audit_store.LOG_PATH.exists():
        try:
            audit_store.LOG_PATH.unlink()
        except Exception:
            pass


def test_read_audit_pagination_and_filtering():
    # create 15 entries for env-1 and 5 for env-2
    for i in range(15):
        audit_store.append_audit({"environment": "env-1", "client": "client-a", "action": "start", "seq": i})
        time.sleep(0.001)
    for i in range(5):
        audit_store.append_audit({"environment": "env-2", "client": "client-b", "action": "stop", "seq": i})

    page0, total = audit_store.read_audit(environment="env-1", page=0, per_page=10)
    assert total == 15
    assert len(page0) == 10

    page1, _ = audit_store.read_audit(environment="env-1", page=1, per_page=10)
    assert len(page1) == 5


def test_activity_endpoint_returns_paginated_results(monkeypatch):
    # ensure audit entries exist
    for i in range(7):
        audit_store.append_audit({"environment": "env-test", "client": "client-x", "action": "run", "seq": i})

    # monkeypatch get_current_user to allow access
    async def fake_get_current_user(req):
        return {"roles": ["admin"], "preferred_username": "tester"}

    monkeypatch.setattr(env_mod, "get_current_user", fake_get_current_user)

    client = TestClient(env_mod.fast_app)
    resp = client.get("/api/environments/env-test/activity?page=0&per_page=5")
    assert resp.status_code == 200
    body = resp.json()
    assert "activity" in body
    assert body["total"] >= 7
    assert len(body["activity"]) <= 5
