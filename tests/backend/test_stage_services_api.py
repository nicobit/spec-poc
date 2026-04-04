"""Tests for function_stage_services endpoint."""
from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def _import_module():
    with patch("app.services.secret_service.SecretService.get_secret_value", return_value="test-secret"):
        import function_stage_services.__init__ as mod
    return mod


def _authed_client(mod, user: dict | None = None):
    if user is None:
        user = {"oid": "user-test", "roles": ["Reader"]}
    mod.get_current_user = AsyncMock(return_value=user)
    return TestClient(mod.fast_app, raise_server_exceptions=False)


def test_endpoint_requires_auth():
    mod = _import_module()
    mod.get_current_user = AsyncMock(side_effect=HTTPException(status_code=401, detail="Unauthorized"))
    client = TestClient(mod.fast_app, raise_server_exceptions=False)
    resp = client.get("/api/stages/some-stage/azure-services")
    assert resp.status_code == 401


def test_endpoint_returns_services():
    mod = _import_module()
    client = _authed_client(mod)

    sample = {"services": [{"name": "s1", "id": "id1"}], "recentFailures": []}

    with patch("app.services.azure_stage_services.get_stage_services", return_value=sample):
        resp = client.get("/api/stages/stage1/azure-services")

    assert resp.status_code == 200
    assert resp.json() == sample


def test_endpoint_handles_backend_error():
    mod = _import_module()
    client = _authed_client(mod)

    with patch("app.services.azure_stage_services.get_stage_services", side_effect=Exception("boom")):
        resp = client.get("/api/stages/stage1/azure-services")

    assert resp.status_code == 503
