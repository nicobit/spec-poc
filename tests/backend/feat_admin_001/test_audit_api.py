import os
import time
from fastapi.testclient import TestClient

from shared import audit_store
from shared import execution_store
import backend.function_audit.__init__ as audit_mod


def setup_function(fn):
    # ensure JSON fallback
    os.environ.pop("AZURE_TABLES_CONNECTION_STRING", None)
    if audit_store.LOG_PATH.exists():
        try:
            audit_store.LOG_PATH.unlink()
        except Exception:
            pass


def test_audit_list_and_export(monkeypatch):
    # seed audit entries
    for i in range(5):
        audit_store.append_audit({"environment": "env-x", "client": "client-x", "action": "update", "seq": i, "actor": "alice"})
        time.sleep(0.001)

    async def fake_get_current_user(req):
        return {"roles": ["admin"], "preferred_username": "tester"}

    monkeypatch.setattr(audit_mod, "get_current_user", fake_get_current_user)

    client = TestClient(audit_mod.fast_app)
    resp = client.get("/api/audit?client=client-x&page=0&per_page=10")
    assert resp.status_code == 200
    body = resp.json()
    assert "items" in body
    assert body["total"] >= 5

    # export
    resp2 = client.get("/api/audit/export?client=client-x")
    assert resp2.status_code == 200
    assert resp2.headers.get("content-type").startswith("text/csv")


def test_executions_list_and_detail(monkeypatch):
    # seed executions
    exec1 = {
        "executionId": "e-1",
        "id": "e-1",
        "clientId": "client-x",
        "environmentId": "env-x",
        "stageId": "stage-a",
        "action": "start",
        "source": "portal",
        "requestedAt": "2026-01-01T00:00:00Z",
        "requestedBy": "tester",
        "status": "failed",
        "resourceActionResults": [],
    }
    execution_store.upsert_stage_execution(exec1)

    async def fake_get_current_user(req):
        return {"roles": ["admin"], "preferred_username": "tester"}

    monkeypatch.setattr(audit_mod, "get_current_user", fake_get_current_user)

    client = TestClient(audit_mod.fast_app)
    resp = client.get("/api/executions?stageId=stage-a")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] >= 1

    resp2 = client.get("/api/executions/e-1")
    assert resp2.status_code == 200
    detail = resp2.json()
    assert detail.get("executionId") == "e-1"
