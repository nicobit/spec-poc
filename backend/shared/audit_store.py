"""Audit store with Azure Table Storage backend and JSON-file fallback.

Provides `append_audit(entry)` and `read_audit(...) -> (entries, total)`.
"""
from __future__ import annotations

import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Tuple

LOG_PATH = Path(__file__).resolve().with_name("audit_log.json")


def _to_primitive(value: Any):
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    try:
        return json.dumps(value, ensure_ascii=False)
    except Exception:
        return str(value)


_TABLES_CONN = os.environ.get("AZURE_TABLES_CONNECTION_STRING") or os.environ.get("AZURE_STORAGE_CONNECTION_STRING") or os.environ.get("AzureWebJobsStorage")
_TABLE_NAME = os.environ.get("AZURE_TABLES_AUDIT_TABLE", "EnvironmentAudit")
_table_client = None


def _get_table_client():
    global _table_client
    if not _TABLES_CONN:
        return None
    if _table_client is not None:
        return _table_client
    try:
        from azure.data.tables import TableServiceClient

        svc = TableServiceClient.from_connection_string(_TABLES_CONN)
        tbl = svc.get_table_client(_TABLE_NAME)
        try:
            tbl.create_table()
        except Exception:
            pass
        _table_client = tbl
        return _table_client
    except Exception:
        _table_client = None
        return None


def append_audit(entry: Dict[str, Any]) -> None:
    ts = datetime.utcnow().isoformat() + "Z"
    entry = dict(entry)
    entry["timestamp"] = ts

    tbl = _get_table_client()
    if tbl is None:
        try:
            with LOG_PATH.open("r", encoding="utf-8") as f:
                arr = json.load(f)
        except Exception:
            arr = []
        arr.append(entry)
        LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with LOG_PATH.open("w", encoding="utf-8") as f:
            json.dump(arr, f, indent=2)
        return

    partition = entry.get("environment") or entry.get("client") or "global"
    row_key = f"{ts}_{uuid.uuid4().hex}"
    entity: Dict[str, Any] = {"PartitionKey": partition, "RowKey": row_key}
    for k, v in entry.items():
        if k in ("PartitionKey", "RowKey"):
            continue
        entity[k] = _to_primitive(v)

    try:
        tbl.create_entity(entity=entity)
    except Exception:
        try:
            with LOG_PATH.open("r", encoding="utf-8") as f:
                arr = json.load(f)
        except Exception:
            arr = []
        arr.append(entry)
        LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with LOG_PATH.open("w", encoding="utf-8") as f:
            json.dump(arr, f, indent=2)


def read_audit(
    environment: str | None = None,
    client: str | None = None,
    stage: str | None = None,
    action: str | None = None,
    start_ts: str | None = None,
    end_ts: str | None = None,
    page: int = 0,
    per_page: int = 50,
) -> Tuple[List[Dict[str, Any]], int]:
    def _matches(e: Dict[str, Any]) -> bool:
        try:
            if environment and e.get("environment") != environment:
                return False
            if client and e.get("client") != client:
                return False
            if stage and e.get("stage") != stage:
                return False
            if action and (str(e.get("action") or "")).lower() != action.lower():
                return False
            ts = e.get("timestamp") or e.get("Timestamp")
            if ts and start_ts and ts < start_ts:
                return False
            if ts and end_ts and ts > end_ts:
                return False
        except Exception:
            return False
        return True

    tbl = _get_table_client()
    if tbl is None:
        try:
            with LOG_PATH.open("r", encoding="utf-8") as f:
                arr = json.load(f)
        except Exception:
            arr = []
        filtered = [e for e in arr if _matches(e)]
        filtered.sort(key=lambda x: x.get("timestamp") or x.get("Timestamp") or "")
        total = len(filtered)
        start = page * per_page
        return filtered[start : start + per_page], total

    results: List[Dict[str, Any]] = []
    try:
        entities = tbl.list_entities()
        for e in entities:
            d = {k: v for k, v in e.items()}
            if _matches(d):
                results.append(d)
    except Exception:
        return [], 0

    results.sort(key=lambda x: x.get("timestamp") or x.get("Timestamp") or "")
    total = len(results)
    start = page * per_page
    return results[start : start + per_page], total
