"""Unit tests for azure_stage_services.get_stage_services

These tests mock the Azure ResourceManagementClient to verify that
the function returns the expected JSON shape when resources are found
via a resource group or by scanning the subscription.
"""
from __future__ import annotations

import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def _make_resource(name: str, rtype: str, rid: str, location: str = "westeurope", tags: dict | None = None, props: dict | None = None):
    props = props or {}
    tags = tags or {}
    # SimpleNamespace will expose attributes like the real SDK model
    return SimpleNamespace(name=name, type=rtype, id=rid, location=location, tags=tags, properties=props)


def test_get_stage_services_by_resource_group(monkeypatch):
    # Import the module under test
    import app.services.azure_stage_services as svc

    # Create fake resources for the resource group
    r1 = _make_resource("stage1-api", "Microsoft.Web/sites", "/subscriptions/0000/resourceGroups/rg-stage1/providers/Microsoft.Web/sites/stage1-api", props={"provisioningState": "Succeeded"})
    r2 = _make_resource("stage1-worker", "Microsoft.ContainerInstance/containerGroups", "/subscriptions/0000/resourceGroups/rg-stage1/providers/Microsoft.ContainerInstance/containerGroups/stage1-worker", props={"provisioningState": "Stopped"})

    class FakeResources:
        def list_by_resource_group(self, rg_name):
            assert rg_name == "rg-stage1"
            return [r1, r2]

    class FakeRMClient:
        def __init__(self, cred, sub):
            pass

        resources = FakeResources()

    monkeypatch.setenv("AZURE_SUBSCRIPTION_ID", "0000")
    monkeypatch.setattr("app.services.azure_stage_services.DefaultAzureCredential", lambda: None)
    monkeypatch.setattr("app.services.azure_stage_services.ResourceManagementClient", lambda cred, sub: FakeRMClient(cred, sub))

    out = svc.get_stage_services("stage1", include_failures=False)
    assert "services" in out
    assert isinstance(out["services"], list)
    names = [s["name"] for s in out["services"]]
    assert "stage1-api" in names and "stage1-worker" in names


def test_get_stage_services_subscription_scan(monkeypatch):
    import app.services.azure_stage_services as svc

    # Create resources scattered across subscription; only some match by name/tag
    r1 = _make_resource("other-service", "Microsoft.Storage/storageAccounts", "/subscriptions/0000/resourceGroups/rg1/providers/Microsoft.Storage/storageAccounts/other", tags={})
    r2 = _make_resource("stage2-api", "Microsoft.Web/sites", "/subscriptions/0000/resourceGroups/rg2/providers/Microsoft.Web/sites/stage2-api", tags={})
    r3 = _make_resource("worker-stage2", "Microsoft.ContainerInstance/containerGroups", "/subscriptions/0000/resourceGroups/rg2/providers/Microsoft.ContainerInstance/containerGroups/worker-stage2", tags={"stage": "stage2"})

    class FakeResources:
        def list_by_resource_group(self, rg_name):
            raise Exception("rg not found")

        def list(self):
            return [r1, r2, r3]

    class FakeRMClient:
        def __init__(self, cred, sub):
            pass

        resources = FakeResources()

    monkeypatch.setenv("AZURE_SUBSCRIPTION_ID", "0000")
    monkeypatch.setattr("app.services.azure_stage_services.DefaultAzureCredential", lambda: None)
    monkeypatch.setattr("app.services.azure_stage_services.ResourceManagementClient", lambda cred, sub: FakeRMClient(cred, sub))

    out = svc.get_stage_services("stage2", include_failures=False)
    assert "services" in out
    names = [s["name"] for s in out["services"]]
    assert "stage2-api" in names or any("stage2" in n for n in names)
