"""Azure Table Storage adapter for schedule persistence.

PartitionKey = client (falls back to "default")
RowKey       = schedule id

Complex fields (dicts / lists) are round-tripped as JSON strings because
Table Storage only supports flat primitive values.
"""

import json
import os
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from azure.core.exceptions import ResourceExistsError, ResourceNotFoundError
from azure.data.tables import TableServiceClient, UpdateMode

logger = logging.getLogger(__name__)

_COMPLEX_FIELDS = {"notification_groups", "postponement_policy"}


def _connection_string() -> Optional[str]:
    """Resolve connection string: explicit override → AzureWebJobsStorage → Azurite dev."""
    conn = os.environ.get("SCHEDULE_TABLE_CONNECTION_STRING")
    if conn:
        return conn
    conn = os.environ.get("AzureWebJobsStorage")
    if conn:
        return conn
    return "UseDevelopmentStorage=true"


def _table_name() -> str:
    return os.environ.get("SCHEDULE_TABLE_NAME", "schedules")


def _partition_key(schedule: Dict[str, Any]) -> str:
    return schedule.get("client") or "default"


def _to_entity(schedule: Dict[str, Any]) -> Dict[str, Any]:
    """Convert a schedule dict to a flat Table Storage entity."""
    entity: Dict[str, Any] = {}
    for key, val in schedule.items():
        if key in _COMPLEX_FIELDS:
            entity[key] = json.dumps(val) if val is not None else ""
        else:
            entity[key] = val
    entity["PartitionKey"] = _partition_key(schedule)
    entity["RowKey"] = schedule["id"]
    return entity


def _from_entity(entity: Dict[str, Any]) -> Dict[str, Any]:
    """Convert a flat Table Storage entity back to a schedule dict."""
    record: Dict[str, Any] = {k: v for k, v in entity.items() if k not in ("PartitionKey", "RowKey")}
    for field in _COMPLEX_FIELDS:
        raw = record.get(field)
        if isinstance(raw, str) and raw:
            try:
                record[field] = json.loads(raw)
            except (ValueError, TypeError):
                pass
        elif raw is None or raw == "":
            record[field] = [] if field == "notification_groups" else None
    # ensure id is populated from RowKey when missing
    if "id" not in record:
        record["id"] = entity.get("RowKey", "")
    return record


class TableScheduleStore:
    """Persistent schedule store backed by Azure Table Storage."""

    def __init__(self) -> None:
        conn = _connection_string()
        self._service = TableServiceClient.from_connection_string(conn)
        self._table_name = _table_name()
        self._table = self._service.get_table_client(self._table_name)
        self._ensured = False

    def _ensure_table(self) -> None:
        if self._ensured:
            return
        try:
            self._service.create_table(self._table_name)
        except ResourceExistsError:
            pass
        except Exception as exc:
            logger.warning("Could not create schedule table: %s", exc)
        self._ensured = True

    def upsert_schedule(self, schedule: Dict[str, Any]) -> Dict[str, Any]:
        if "id" not in schedule:
            raise ValueError("schedule must include 'id'")
        self._ensure_table()
        entity = _to_entity(schedule)
        self._table.upsert_entity(entity=entity, mode=UpdateMode.REPLACE)
        return schedule

    def get_schedule(self, schedule_id: str) -> Optional[Dict[str, Any]]:
        self._ensure_table()
        # Scan all partitions because we don't know the client/partition at lookup time.
        # For typical schedule counts (< a few thousand) this is acceptable.
        try:
            entities = self._table.query_entities(
                query_filter=f"RowKey eq '{schedule_id}'"
            )
            for entity in entities:
                return _from_entity(dict(entity))
        except Exception as exc:
            logger.warning("get_schedule(%s) error: %s", schedule_id, exc)
        return None

    def list_schedules(self, limit: int = 500) -> List[Dict[str, Any]]:
        self._ensure_table()
        results: List[Dict[str, Any]] = []
        try:
            for entity in self._table.list_entities():
                results.append(_from_entity(dict(entity)))
                if len(results) >= limit:
                    break
        except Exception as exc:
            logger.warning("list_schedules error: %s", exc)
        return results

    def get_due_schedules(self, now_iso: str) -> List[Dict[str, Any]]:
        """Return enabled schedules whose next_run <= now_iso."""
        self._ensure_table()
        results: List[Dict[str, Any]] = []
        try:
            # ISO-8601 strings compare lexicographically, so OData string filter works.
            query = f"enabled eq true and next_run le '{now_iso}'"
            for entity in self._table.query_entities(query_filter=query):
                results.append(_from_entity(dict(entity)))
        except Exception as exc:
            logger.warning("get_due_schedules error, falling back to full scan: %s", exc)
            # Full-scan fallback (e.g. Azurite or query syntax issues)
            now = datetime.fromisoformat(now_iso)
            if now.tzinfo is None:
                now = now.replace(tzinfo=timezone.utc)
            for item in self.list_schedules():
                if not item.get("enabled"):
                    continue
                try:
                    nr_raw = item.get("next_run", "")
                    nr = datetime.fromisoformat(nr_raw)
                    if nr.tzinfo is None:
                        nr = nr.replace(tzinfo=timezone.utc)
                    if nr <= now:
                        results.append(item)
                except Exception:
                    pass
        return results

    def mark_next_run(self, schedule_id: str, next_run_iso: str) -> Optional[Dict[str, Any]]:
        item = self.get_schedule(schedule_id)
        if not item:
            return None
        item["next_run"] = next_run_iso
        return self.upsert_schedule(item)

    def delete_schedule(self, schedule_id: str) -> bool:
        self._ensure_table()
        item = self.get_schedule(schedule_id)
        if not item:
            return False
        try:
            self._table.delete_entity(
                partition_key=_partition_key(item),
                row_key=schedule_id,
            )
            return True
        except ResourceNotFoundError:
            return False
        except Exception as exc:
            logger.warning("delete_schedule(%s) error: %s", schedule_id, exc)
            return False


class _LazyTableProxy:
    """Initialises TableScheduleStore on first use."""

    def __init__(self) -> None:
        self._store: Optional[TableScheduleStore] = None

    def _ensure(self) -> TableScheduleStore:
        if self._store is None:
            self._store = TableScheduleStore()
        return self._store

    def __getattr__(self, item: str):
        return getattr(self._ensure(), item)


def get_table_schedule_store() -> _LazyTableProxy:
    return _LazyTableProxy()
