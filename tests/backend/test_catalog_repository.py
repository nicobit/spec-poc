"""Tests for shared/catalog_repository.py.

Covers:
- _FileCatalogProvider: get_stage (hit, miss, missing file), list_executions
- TableCatalogProvider: get_stage (parses 'data' JSON, finds matching stage, returns None when absent)
- TableCatalogProvider: list_executions (filters by stage, respects lookback window)
- CosmosCatalogProvider: get_stage (walks stages, returns None when absent)
- get_catalog_provider() factory: Storage conn → Cosmos conn → file fallback
"""
import importlib
import importlib.util
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import ModuleType
from typing import Any, Dict
from unittest.mock import MagicMock, patch


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _import_catalog(env: dict | None = None) -> ModuleType:
    """Import catalog_repository with optional env overrides, bypassing sys.modules cache."""
    repo_root = Path(__file__).resolve().parents[2]
    module_path = repo_root / "backend" / "shared" / "catalog_repository.py"

    # Add backend/ to sys.path so that `from azure.data.tables import ...` resolves
    backend_path = str(repo_root / "backend")
    if backend_path not in sys.path:
        sys.path.insert(0, backend_path)

    old_env = os.environ.copy()
    if env:
        os.environ.update(env)
    try:
        # Force fresh load each time by using a unique module name
        spec = importlib.util.spec_from_file_location("_catalog_repo_under_test", module_path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod
    finally:
        os.environ.clear()
        os.environ.update(old_env)


# ---------------------------------------------------------------------------
# _FileCatalogProvider
# ---------------------------------------------------------------------------

SPECS_PATH = Path(__file__).resolve().parents[2] / "specs" / "stages.json"


def _write_specs(data: Dict[str, Any]) -> None:
    SPECS_PATH.parent.mkdir(parents=True, exist_ok=True)
    SPECS_PATH.write_text(json.dumps(data), encoding="utf-8")


def _remove_specs() -> None:
    if SPECS_PATH.exists():
        SPECS_PATH.unlink()


class TestFileCatalogProvider:
    def setup_method(self):
        self._backup = SPECS_PATH.read_text(encoding="utf-8") if SPECS_PATH.exists() else None

    def teardown_method(self):
        if self._backup is not None:
            _write_specs(json.loads(self._backup))
        elif SPECS_PATH.exists():
            _remove_specs()

    def test_get_stage_returns_entry(self):
        _write_specs({"my-stage": {"azureServices": [{"name": "svc-a"}]}})
        mod = _import_catalog()
        provider = mod._FileCatalogProvider()
        result = provider.get_stage("my-stage")
        assert result is not None
        assert result["azureServices"][0]["name"] == "svc-a"

    def test_get_stage_returns_none_for_missing_key(self):
        _write_specs({"other-stage": {}})
        mod = _import_catalog()
        provider = mod._FileCatalogProvider()
        assert provider.get_stage("nonexistent") is None

    def test_get_stage_returns_none_when_file_absent(self):
        _remove_specs()
        mod = _import_catalog()
        provider = mod._FileCatalogProvider()
        assert provider.get_stage("any-stage") is None

    def test_list_executions_always_returns_empty(self):
        _write_specs({"s": {}})
        mod = _import_catalog()
        provider = mod._FileCatalogProvider()
        assert provider.list_executions("s") == []


# ---------------------------------------------------------------------------
# TableCatalogProvider
# ---------------------------------------------------------------------------

def _make_env_entity(stage_id: str, stage_data: Dict[str, Any]) -> Dict[str, Any]:
    """Build a mock Environments table entity with a stage inside its 'data' JSON."""
    env = {
        "id": "env-1",
        "name": "Env One",
        "status": "active",
        "stages": [stage_data],
    }
    return {
        "PartitionKey": "environments",
        "RowKey": "env-1",
        "data": json.dumps(env),
    }


def _make_audit_entity(
    stage_id: str,
    schedule_id: str = "sched-1",
    status: str = "success",
    error: str | None = None,
    ts: datetime | None = None,
) -> Dict[str, Any]:
    ts = ts or datetime.now(timezone.utc)
    return {
        "PartitionKey": stage_id,
        "RowKey": f"{ts.isoformat()}-uuid",
        "stage": stage_id,
        "scheduleId": schedule_id,
        "status": status,
        "error": error,
        "timestamp": ts.isoformat(),
        "environment": "env-1",
        "client": "client-a",
    }


class TestTableCatalogProvider:
    def _build_provider(self, env_entities=None, audit_entities=None):
        """Return a TableCatalogProvider with fully mocked table clients."""
        mod = _import_catalog()

        env_table = MagicMock()
        env_table.list_entities.return_value = env_entities or []
        env_table.create_table.return_value = None

        audit_table = MagicMock()
        audit_table.list_entities.return_value = audit_entities or []
        audit_table.create_table.return_value = None

        mock_svc = MagicMock()
        mock_svc.get_table_client.side_effect = lambda name: (
            env_table if name in ("Environments", os.environ.get("AZURE_TABLES_ENV_TABLE", "Environments"))
            else audit_table
        )

        with patch.dict("sys.modules", {"azure.data.tables": MagicMock(
            TableServiceClient=MagicMock(from_connection_string=MagicMock(return_value=mock_svc))
        )}):
            provider = mod.TableCatalogProvider.__new__(mod.TableCatalogProvider)
            provider._env_table = env_table
            provider._audit_table = audit_table

        return provider

    def test_get_stage_finds_matching_stage(self):
        stage = {"id": "stage-x", "name": "Stage X", "resourceActions": [{"type": "SqlServer", "serverName": "srv1"}]}
        entities = [_make_env_entity("stage-x", stage)]
        provider = self._build_provider(env_entities=entities)
        result = provider.get_stage("stage-x")
        assert result is not None
        assert result["id"] == "stage-x"
        assert result["resourceActions"][0]["serverName"] == "srv1"

    def test_get_stage_returns_none_when_stage_absent(self):
        stage = {"id": "other-stage", "name": "Other"}
        entities = [_make_env_entity("other-stage", stage)]
        provider = self._build_provider(env_entities=entities)
        assert provider.get_stage("stage-x") is None

    def test_get_stage_returns_none_when_no_environments(self):
        provider = self._build_provider(env_entities=[])
        assert provider.get_stage("stage-x") is None

    def test_get_stage_parses_data_field_as_json_string(self):
        """Ensure 'data' stored as a JSON string (as in real Azure Tables) is parsed correctly."""
        stage = {"id": "s1", "name": "S1"}
        env_dict = {"stages": [stage]}
        entity = {
            "PartitionKey": "environments",
            "RowKey": "e1",
            "data": json.dumps(env_dict),  # explicitly a string
        }
        provider = self._build_provider(env_entities=[entity])
        result = provider.get_stage("s1")
        assert result is not None and result["id"] == "s1"

    def test_list_executions_filters_by_stage(self):
        now = datetime.now(timezone.utc)
        entities = [
            _make_audit_entity("stage-a", ts=now),
            _make_audit_entity("stage-b", ts=now),  # different stage — should be excluded
        ]
        provider = self._build_provider(audit_entities=entities)
        results = provider.list_executions("stage-a", lookback_days=7)
        assert len(results) == 1
        assert results[0]["stage"] == "stage-a"

    def test_list_executions_respects_lookback_window(self):
        now = datetime.now(timezone.utc)
        recent = _make_audit_entity("stage-a", schedule_id="s1", ts=now - timedelta(days=3))
        old = _make_audit_entity("stage-a", schedule_id="s2", ts=now - timedelta(days=10))
        provider = self._build_provider(audit_entities=[recent, old])
        results = provider.list_executions("stage-a", lookback_days=7)
        schedule_ids = {r["scheduleId"] for r in results}
        assert "s1" in schedule_ids
        assert "s2" not in schedule_ids

    def test_list_executions_returns_empty_when_no_records(self):
        provider = self._build_provider(audit_entities=[])
        assert provider.list_executions("stage-a") == []

    def test_list_executions_returns_all_fields(self):
        now = datetime.now(timezone.utc)
        entity = _make_audit_entity("stage-a", schedule_id="sched-99", status="error", error="oops", ts=now)
        provider = self._build_provider(audit_entities=[entity])
        results = provider.list_executions("stage-a", lookback_days=7)
        assert len(results) == 1
        rec = results[0]
        assert rec["scheduleId"] == "sched-99"
        assert rec["status"] == "error"
        assert rec["error"] == "oops"


# ---------------------------------------------------------------------------
# CosmosCatalogProvider
# ---------------------------------------------------------------------------

class TestCosmosCatalogProvider:
    def _build_provider(self, env_docs=None):
        mod = _import_catalog()

        container = MagicMock()
        container.query_items.return_value = env_docs or []

        mock_db = MagicMock()
        mock_db.create_container_if_not_exists.return_value = container

        mock_client = MagicMock()
        mock_client.create_database_if_not_exists.return_value = mock_db

        with patch.dict("sys.modules", {"azure.cosmos": MagicMock(
            CosmosClient=MagicMock(from_connection_string=MagicMock(return_value=mock_client)),
            PartitionKey=MagicMock(),
        )}):
            provider = mod.CosmosCatalogProvider.__new__(mod.CosmosCatalogProvider)
            provider._env_container = container

        return provider

    def test_get_stage_finds_matching_stage(self):
        docs = [{"stages": [{"id": "cosmos-stage", "name": "Cosmos Stage"}]}]
        provider = self._build_provider(env_docs=docs)
        result = provider.get_stage("cosmos-stage")
        assert result is not None
        assert result["id"] == "cosmos-stage"

    def test_get_stage_returns_none_when_absent(self):
        docs = [{"stages": [{"id": "other"}]}]
        provider = self._build_provider(env_docs=docs)
        assert provider.get_stage("cosmos-stage") is None

    def test_get_stage_returns_none_when_no_docs(self):
        provider = self._build_provider(env_docs=[])
        assert provider.get_stage("any") is None

    def test_list_executions_returns_empty(self):
        provider = self._build_provider()
        assert provider.list_executions("any-stage") == []


# ---------------------------------------------------------------------------
# get_catalog_provider factory
# ---------------------------------------------------------------------------

class TestGetCatalogProviderFactory:
    def test_returns_table_provider_when_tables_conn_set(self):
        mod = _import_catalog()
        mock_provider = MagicMock()
        with patch.object(mod, "TableCatalogProvider", return_value=mock_provider) as MockTable, \
             patch.dict(os.environ, {"AZURE_TABLES_CONNECTION_STRING": "UseDevelopmentStorage=true"}, clear=False):
            result = mod.get_catalog_provider()
        MockTable.assert_called_once_with("UseDevelopmentStorage=true")
        assert result is mock_provider

    def test_returns_table_provider_when_storage_conn_set(self):
        mod = _import_catalog()
        mock_provider = MagicMock()
        with patch.object(mod, "TableCatalogProvider", return_value=mock_provider) as MockTable, \
             patch.dict(os.environ, {"AZURE_STORAGE_CONNECTION_STRING": "DefaultEndpointsProtocol=https;..."}, clear=False):
            # ensure no higher-priority var leaks in
            os.environ.pop("AZURE_TABLES_CONNECTION_STRING", None)
            result = mod.get_catalog_provider()
        MockTable.assert_called_once()
        assert result is mock_provider

    def test_returns_table_provider_when_azurewebjobsstorage_set(self):
        mod = _import_catalog()
        mock_provider = MagicMock()
        env = {"AzureWebJobsStorage": "UseDevelopmentStorage=true"}
        with patch.object(mod, "TableCatalogProvider", return_value=mock_provider), \
             patch.dict(os.environ, env, clear=False):
            os.environ.pop("AZURE_TABLES_CONNECTION_STRING", None)
            os.environ.pop("AZURE_STORAGE_CONNECTION_STRING", None)
            result = mod.get_catalog_provider()
        assert result is mock_provider

    def test_returns_cosmos_provider_when_only_cosmos_conn_set(self):
        mod = _import_catalog()
        mock_provider = MagicMock()
        env = {"COSMOS_CONNECTION_STRING": "AccountEndpoint=https://..."}
        with patch.object(mod, "CosmosCatalogProvider", return_value=mock_provider) as MockCosmos, \
             patch.dict(os.environ, env, clear=False):
            os.environ.pop("AZURE_TABLES_CONNECTION_STRING", None)
            os.environ.pop("AZURE_STORAGE_CONNECTION_STRING", None)
            os.environ.pop("AzureWebJobsStorage", None)
            result = mod.get_catalog_provider()
        MockCosmos.assert_called_once_with("AccountEndpoint=https://...")
        assert result is mock_provider

    def test_returns_file_provider_when_no_conn_configured(self):
        mod = _import_catalog()
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("AZURE_TABLES_CONNECTION_STRING", None)
            os.environ.pop("AZURE_STORAGE_CONNECTION_STRING", None)
            os.environ.pop("AzureWebJobsStorage", None)
            os.environ.pop("COSMOS_CONNECTION_STRING", None)
            result = mod.get_catalog_provider()
        assert isinstance(result, mod._FileCatalogProvider)

    def test_falls_back_to_cosmos_when_table_provider_raises(self):
        mod = _import_catalog()
        mock_cosmos = MagicMock()
        with patch.object(mod, "TableCatalogProvider", side_effect=Exception("conn fail")), \
             patch.object(mod, "CosmosCatalogProvider", return_value=mock_cosmos), \
             patch.dict(os.environ, {
                 "AZURE_TABLES_CONNECTION_STRING": "bad",
                 "COSMOS_CONNECTION_STRING": "good",
             }, clear=False):
            result = mod.get_catalog_provider()
        assert result is mock_cosmos

    def test_falls_back_to_file_when_both_providers_raise(self):
        mod = _import_catalog()
        with patch.object(mod, "TableCatalogProvider", side_effect=Exception("fail")), \
             patch.object(mod, "CosmosCatalogProvider", side_effect=Exception("fail")), \
             patch.dict(os.environ, {
                 "AZURE_TABLES_CONNECTION_STRING": "bad",
                 "COSMOS_CONNECTION_STRING": "bad",
             }, clear=False):
            result = mod.get_catalog_provider()
        assert isinstance(result, mod._FileCatalogProvider)
