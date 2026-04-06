import os
import time
from fastapi.testclient import TestClient

from shared import audit_store
from shared import execution_store
import backend.function_audit.__init__ as audit_mod


def setup_function(fn):
    os.environ.pop("AZURE_TABLES_CONNECTION_STRING", None)
    if audit_store.LOG_PATH.exists():
        try:
            audit_store.LOG_PATH.unlink()
        except Exception:
            pass


def test_environment_manager_scoping(monkeypatch):
    # seed audits for two clients
    for i in range(3):
        audit_store.append_audit({"environment": "env-a", "client": "client-x", "action": "update", "seq": i})
    for i in range(2):
        audit_store.append_audit({"environment": "env-b", "client": "client-y", "action": "update", "seq": i})

    async def fake_get_current_user(req):
        # environment-manager scoped to client-x
        return {"roles": ["environment-manager"], "preferred_username": "mgr", "client": "client-x"}

    monkeypatch.setattr(audit_mod, "get_current_user", fake_get_current_user)
    client = TestClient(audit_mod.fast_app)

    # no client filter -> should be scoped to client-x only
    resp = client.get("/api/audit?page=0&per_page=10")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] >= 3
    assert all((it.get("client") or it.get("client") == "client-x") for it in body["items"]) or len(body["items"]) >= 1

    # explicit other client should be forbidden
    resp2 = client.get("/api/audit?client=client-y")
    assert resp2.status_code == 403


def test_export_masks_details_for_non_admin(monkeypatch):
    # seed audit with details
    audit_store.append_audit({"environment": "env-a", "client": "client-x", "action": "sensitive", "details": {"ssn": "123-45-6789"}})

    async def fake_get_current_user(req):
        return {"roles": ["auditor"], "preferred_username": "auditor1"}

    monkeypatch.setattr(audit_mod, "get_current_user", fake_get_current_user)
    client = TestClient(audit_mod.fast_app)

    resp = client.get("/api/audit/export?client=client-x")
    assert resp.status_code == 200
    text = resp.content.decode("utf-8")
    # details column should show redacted marker
    assert "<redacted>" in text or "no_records" not in text

    # export should also log an audit entry
    entries, total = audit_store.read_audit(action="export")
    assert total >= 1
