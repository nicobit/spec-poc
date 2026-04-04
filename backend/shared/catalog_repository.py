"""Catalog provider — reads stage definitions and execution history from the configured store.

Provider selection is based on available connection strings, evaluated at call time:
  AZURE_TABLES_CONNECTION_STRING / AZURE_STORAGE_CONNECTION_STRING / AzureWebJobsStorage
      → StorageTable adapter (active in dev via Azurite)
  COSMOS_CONNECTION_STRING
      → Cosmos DB adapter
  neither configured
      → file fallback (dev only, reads specs/stages.json)

Env vars for table names:
  AZURE_TABLES_ENV_TABLE   (default: Environments)
  AZURE_TABLES_AUDIT_TABLE (default: EnvironmentAudit)
  COSMOS_DB_NAME           (default: adminportal)
  COSMOS_ENV_CONTAINER     (default: environments)
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


class _BaseCatalogProvider:
    """Base interface for catalog reads.  Concrete providers must implement both methods."""

    def get_stage(self, stage_id: str) -> Optional[Dict[str, Any]]:
        """Return stage definition dict or None if not found."""
        raise NotImplementedError

    def list_executions(
        self,
        stage_id: str,
        lookback_days: int = 7,
    ) -> List[Dict[str, Any]]:
        """Return execution records for the stage within the lookback window."""
        raise NotImplementedError


class TableCatalogProvider(_BaseCatalogProvider):
    """Read stage definitions from the Environments table and executions from EnvironmentAudit."""

    def __init__(self, conn_str: str) -> None:
        from azure.data.tables import TableServiceClient

        env_table_name = os.environ.get("AZURE_TABLES_ENV_TABLE", "Environments")
        audit_table_name = os.environ.get("AZURE_TABLES_AUDIT_TABLE", "EnvironmentAudit")
        svc = TableServiceClient.from_connection_string(conn_str)
        self._env_table = svc.get_table_client(env_table_name)
        self._audit_table = svc.get_table_client(audit_table_name)
        for tbl in (self._env_table, self._audit_table):
            try:
                tbl.create_table()
            except Exception:
                pass

    def get_stage(self, stage_id: str) -> Optional[Dict[str, Any]]:
        try:
            for ent in self._env_table.list_entities():
                raw = ent.get("data")
                env = json.loads(raw) if isinstance(raw, str) else (raw or {})
                for stage in env.get("stages") or []:
                    if stage.get("id") == stage_id:
                        return stage
        except Exception:
            pass
        return None

    def list_executions(
        self,
        stage_id: str,
        lookback_days: int = 7,
    ) -> List[Dict[str, Any]]:
        cutoff = datetime.now(timezone.utc) - timedelta(days=lookback_days)
        results: List[Dict[str, Any]] = []
        try:
            for ent in self._audit_table.list_entities():
                rec_stage = ent.get("stage") or ent.get("stageId") or ""
                if rec_stage != stage_id:
                    continue
                ts_raw = ent.get("timestamp") or ent.get("Timestamp")
                try:
                    ts = (
                        datetime.fromisoformat(str(ts_raw).replace("Z", "+00:00"))
                        if ts_raw
                        else None
                    )
                except Exception:
                    ts = None
                if ts is not None and ts < cutoff:
                    continue
                results.append({k: v for k, v in ent.items()})
        except Exception:
            pass
        return results


class CosmosCatalogProvider(_BaseCatalogProvider):
    """Read stage definitions from Cosmos DB environments container."""

    def __init__(self, conn_str: str) -> None:
        from azure.cosmos import CosmosClient, PartitionKey

        cosmos_db = os.environ.get("COSMOS_DB_NAME", "adminportal")
        cosmos_container = os.environ.get("COSMOS_ENV_CONTAINER", "environments")
        client = CosmosClient.from_connection_string(conn_str)
        db = client.create_database_if_not_exists(id=cosmos_db)
        self._env_container = db.create_container_if_not_exists(
            id=cosmos_container, partition_key=PartitionKey(path="/client")
        )

    def get_stage(self, stage_id: str) -> Optional[Dict[str, Any]]:
        try:
            for env in self._env_container.query_items(
                "SELECT * FROM c", enable_cross_partition_query=True
            ):
                for stage in (env.get("stages") or []):
                    if stage.get("id") == stage_id:
                        return stage
        except Exception:
            pass
        return None

    def list_executions(
        self,
        stage_id: str,
        lookback_days: int = 7,
    ) -> List[Dict[str, Any]]:
        # Cosmos-backed execution log not yet implemented.
        return []


class _FileCatalogProvider(_BaseCatalogProvider):
    """Dev-only fallback: reads specs/stages.json.

    The file format is {stage_id: {azureServices: [...], schedules: [...], ...}}.
    Used only when no storage connection string is configured.
    """

    _DEFAULT_PATH = Path(__file__).resolve().parents[2] / "specs" / "stages.json"

    def get_stage(self, stage_id: str) -> Optional[Dict[str, Any]]:
        try:
            if self._DEFAULT_PATH.exists():
                catalog = json.loads(self._DEFAULT_PATH.read_text(encoding="utf-8"))
                return catalog.get(stage_id)
        except Exception:
            pass
        return None

    def list_executions(
        self,
        stage_id: str,
        lookback_days: int = 7,
    ) -> List[Dict[str, Any]]:
        return []


def get_catalog_provider() -> _BaseCatalogProvider:
    """Return a catalog provider based on the currently configured connection strings.

    Connection string resolution order (evaluated at call time):
      1. Azure Storage Table (AZURE_TABLES_CONNECTION_STRING / AZURE_STORAGE_CONNECTION_STRING /
         AzureWebJobsStorage)
      2. Cosmos DB (COSMOS_CONNECTION_STRING)
      3. File-based fallback (specs/stages.json) — dev only
    """
    tables_conn = (
        os.environ.get("AZURE_TABLES_CONNECTION_STRING")
        or os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
        or os.environ.get("AzureWebJobsStorage")
    )
    if tables_conn:
        try:
            return TableCatalogProvider(tables_conn)
        except Exception:
            pass

    cosmos_conn = os.environ.get("COSMOS_CONNECTION_STRING")
    if cosmos_conn:
        try:
            return CosmosCatalogProvider(cosmos_conn)
        except Exception:
            pass

    return _FileCatalogProvider()
