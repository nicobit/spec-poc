"""Tests for function_ai_sessions — session management HTTP endpoints."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def _import_sessions_module():
    with patch("app.services.secret_service.SecretService.get_secret_value", return_value="test-secret"):
        import function_ai_sessions.__init__ as mod
    return mod


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _authed_client(mod, user: dict | None = None):
    """Return a TestClient with get_current_user patched."""
    if user is None:
        user = {"oid": "user-test", "roles": ["Reader"]}
    mod.get_current_user = AsyncMock(return_value=user)
    return TestClient(mod.fast_app, raise_server_exceptions=False)


# ---------------------------------------------------------------------------
# Authentication guard
# ---------------------------------------------------------------------------

def test_list_sessions_requires_auth():
    mod = _import_sessions_module()
    # Simulate unauthenticated (get_current_user raises HTTPException 401)
    from fastapi import HTTPException
    mod.get_current_user = AsyncMock(side_effect=HTTPException(status_code=401, detail="Unauthorized"))
    client = TestClient(mod.fast_app, raise_server_exceptions=False)
    resp = client.get("/api/ai/sessions")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/ai/sessions — list
# ---------------------------------------------------------------------------

def test_list_sessions_returns_empty_list_for_new_user():
    mod = _import_sessions_module()
    client = _authed_client(mod)
    import shared.chat_session_store as store_module
    with patch.object(store_module, "COSMOS_CONN", None):
        store_module.CHAT_SESSIONS.clear()
        resp = client.get("/api/ai/sessions")
    assert resp.status_code == 200
    assert resp.json()["sessions"] == []


def test_list_sessions_returns_sessions_for_user():
    mod = _import_sessions_module()
    client = _authed_client(mod, {"oid": "u-list", "roles": []})
    import shared.chat_session_store as store_module
    from shared.chat_session_store import new_session, put_session_inmemory

    with patch.object(store_module, "COSMOS_CONN", None):
        store_module.CHAT_SESSIONS.clear()
        s = new_session("u-list", name="Alpha")
        put_session_inmemory(s)
        resp = client.get("/api/ai/sessions")

    assert resp.status_code == 200
    sessions = resp.json()["sessions"]
    assert len(sessions) == 1
    assert sessions[0]["name"] == "Alpha"


def test_list_sessions_excludes_other_users():
    mod = _import_sessions_module()
    client = _authed_client(mod, {"oid": "u-me", "roles": []})
    import shared.chat_session_store as store_module
    from shared.chat_session_store import new_session, put_session_inmemory

    with patch.object(store_module, "COSMOS_CONN", None):
        store_module.CHAT_SESSIONS.clear()
        put_session_inmemory(new_session("u-other", name="NotMine"))
        put_session_inmemory(new_session("u-me", name="Mine"))
        resp = client.get("/api/ai/sessions")

    sessions = resp.json()["sessions"]
    assert all(s["name"] != "NotMine" for s in sessions)
    assert any(s["name"] == "Mine" for s in sessions)


# ---------------------------------------------------------------------------
# GET /api/ai/sessions/{session_id} — load turns
# ---------------------------------------------------------------------------

def test_get_session_returns_404_for_unknown():
    mod = _import_sessions_module()
    client = _authed_client(mod)
    import shared.chat_session_store as store_module
    with patch.object(store_module, "COSMOS_CONN", None):
        store_module.CHAT_SESSIONS.clear()
        resp = client.get("/api/ai/sessions/no-such-id")
    assert resp.status_code == 404


def test_get_session_returns_404_for_wrong_user():
    mod = _import_sessions_module()
    client = _authed_client(mod, {"oid": "u-a", "roles": []})
    import shared.chat_session_store as store_module
    from shared.chat_session_store import new_session, put_session_inmemory

    with patch.object(store_module, "COSMOS_CONN", None):
        store_module.CHAT_SESSIONS.clear()
        s = new_session("u-b", name="B")
        put_session_inmemory(s)
        resp = client.get(f"/api/ai/sessions/{s['id']}")
    assert resp.status_code == 404


def test_get_session_returns_turns_for_owner():
    mod = _import_sessions_module()
    client = _authed_client(mod, {"oid": "u-owner", "roles": []})
    import shared.chat_session_store as store_module
    from shared.chat_session_store import new_session, append_turn, put_session_inmemory

    with patch.object(store_module, "COSMOS_CONN", None):
        store_module.CHAT_SESSIONS.clear()
        s = new_session("u-owner", name="Mine")
        append_turn(s, "user", "hello")
        append_turn(s, "assistant", "hi there")
        put_session_inmemory(s)
        resp = client.get(f"/api/ai/sessions/{s['id']}")

    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "Mine"
    assert isinstance(body["turns"], list)
    assert any(t["content"] == "hello" for t in body["turns"])


# ---------------------------------------------------------------------------
# PATCH /api/ai/sessions/{session_id} — rename
# ---------------------------------------------------------------------------

def test_rename_session_returns_404_for_missing():
    mod = _import_sessions_module()
    client = _authed_client(mod)
    import shared.chat_session_store as store_module
    with patch.object(store_module, "COSMOS_CONN", None):
        store_module.CHAT_SESSIONS.clear()
        resp = client.patch("/api/ai/sessions/no-such", json={"name": "New"})
    assert resp.status_code == 404


def test_rename_session_updates_name():
    mod = _import_sessions_module()
    client = _authed_client(mod, {"oid": "u-rename", "roles": []})
    import shared.chat_session_store as store_module
    from shared.chat_session_store import new_session, put_session_inmemory, get_session_inmemory

    with patch.object(store_module, "COSMOS_CONN", None):
        store_module.CHAT_SESSIONS.clear()
        s = new_session("u-rename", name="Old")
        put_session_inmemory(s)
        resp = client.patch(f"/api/ai/sessions/{s['id']}", json={"name": "New Name"})
        assert resp.status_code == 200
        assert resp.json()["name"] == "New Name"
        loaded = get_session_inmemory(s["id"], "u-rename")
        assert loaded["name"] == "New Name"


def test_rename_session_rejects_empty_name():
    mod = _import_sessions_module()
    client = _authed_client(mod, {"oid": "u-r", "roles": []})
    import shared.chat_session_store as store_module
    from shared.chat_session_store import new_session, put_session_inmemory

    with patch.object(store_module, "COSMOS_CONN", None):
        store_module.CHAT_SESSIONS.clear()
        s = new_session("u-r")
        put_session_inmemory(s)
        resp = client.patch(f"/api/ai/sessions/{s['id']}", json={"name": ""})
    assert resp.status_code == 422


def test_rename_session_rejects_name_over_120():
    mod = _import_sessions_module()
    client = _authed_client(mod, {"oid": "u-r2", "roles": []})
    import shared.chat_session_store as store_module
    from shared.chat_session_store import new_session, put_session_inmemory

    with patch.object(store_module, "COSMOS_CONN", None):
        store_module.CHAT_SESSIONS.clear()
        s = new_session("u-r2")
        put_session_inmemory(s)
        resp = client.patch(f"/api/ai/sessions/{s['id']}", json={"name": "X" * 121})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# DELETE /api/ai/sessions/{session_id} — hard-delete
# ---------------------------------------------------------------------------

def test_delete_session_removes_document():
    mod = _import_sessions_module()
    client = _authed_client(mod, {"oid": "u-del", "roles": []})
    import shared.chat_session_store as store_module
    from shared.chat_session_store import new_session, put_session_inmemory, get_session_inmemory

    with patch.object(store_module, "COSMOS_CONN", None):
        store_module.CHAT_SESSIONS.clear()
        s = new_session("u-del")
        put_session_inmemory(s)
        resp = client.delete(f"/api/ai/sessions/{s['id']}")
        assert resp.status_code == 204
        assert get_session_inmemory(s["id"], "u-del") is None


def test_delete_session_is_idempotent():
    """Deleting a non-existent session must not return an error."""
    mod = _import_sessions_module()
    client = _authed_client(mod)
    import shared.chat_session_store as store_module
    with patch.object(store_module, "COSMOS_CONN", None):
        store_module.CHAT_SESSIONS.clear()
        resp = client.delete("/api/ai/sessions/no-such-id")
    assert resp.status_code == 204


def test_delete_session_wrong_user_does_not_delete():
    mod = _import_sessions_module()
    client = _authed_client(mod, {"oid": "u-attacker", "roles": []})
    import shared.chat_session_store as store_module
    from shared.chat_session_store import new_session, put_session_inmemory, get_session_inmemory

    with patch.object(store_module, "COSMOS_CONN", None):
        store_module.CHAT_SESSIONS.clear()
        s = new_session("u-victim")
        put_session_inmemory(s)
        client.delete(f"/api/ai/sessions/{s['id']}")
        # Session must still exist for the real owner
        assert get_session_inmemory(s["id"], "u-victim") is not None
