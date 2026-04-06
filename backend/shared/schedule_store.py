"""Unified schedule store factory.

Pick the backend via the ``SCHEDULE_STORE_BACKEND`` environment variable:

    table   (default) – Azure Table Storage via table_schedule_store.py
    cosmos            – Azure Cosmos DB via cosmos_store.py
    memory            – In-process list via scheduler_store.py (tests / dev)

All three adapters expose the same interface:
    upsert_schedule(schedule) -> schedule
    get_schedule(schedule_id) -> dict | None
    list_schedules(limit=500) -> list[dict]
    get_due_schedules(now_iso) -> list[dict]
    mark_next_run(schedule_id, next_run_iso) -> dict | None
    delete_schedule(schedule_id) -> bool
"""

import os
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Memory adapter (wraps the existing scheduler_store list)
# ---------------------------------------------------------------------------

class MemoryScheduleStore:
    """In-process schedule store backed by the shared SCHEDULES list."""

    def _schedules(self):
        from shared import scheduler_store as _s
        return _s.SCHEDULES

    def upsert_schedule(self, schedule: Dict[str, Any]) -> Dict[str, Any]:
        schedules = self._schedules()
        for idx, s in enumerate(schedules):
            if s.get("id") == schedule.get("id"):
                schedules[idx] = schedule
                return schedule
        schedules.append(schedule)
        return schedule

    def get_schedule(self, schedule_id: str) -> Optional[Dict[str, Any]]:
        return next((s for s in self._schedules() if s.get("id") == schedule_id), None)

    def list_schedules(self, limit: int = 500) -> List[Dict[str, Any]]:
        return list(self._schedules()[:limit])

    def get_due_schedules(self, now_iso: str) -> List[Dict[str, Any]]:
        now = datetime.fromisoformat(now_iso)
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)
        results = []
        for s in self._schedules():
            if not s.get("enabled"):
                continue
            try:
                nr = datetime.fromisoformat(s.get("next_run", ""))
                if nr.tzinfo is None:
                    nr = nr.replace(tzinfo=timezone.utc)
                if nr <= now:
                    results.append(s)
            except Exception:
                pass
        return results

    def mark_next_run(self, schedule_id: str, next_run_iso: str) -> Optional[Dict[str, Any]]:
        for s in self._schedules():
            if s.get("id") == schedule_id:
                s["next_run"] = next_run_iso
                return s
        return None

    def delete_schedule(self, schedule_id: str) -> bool:
        schedules = self._schedules()
        before = len(schedules)
        from shared import scheduler_store as _s
        _s.SCHEDULES[:] = [s for s in schedules if s.get("id") != schedule_id]
        return len(_s.SCHEDULES) < before


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def get_schedule_store():
    """Return the configured schedule store instance.

    Reads ``SCHEDULE_STORE_BACKEND`` (default: ``table``).
    """
    backend = os.environ.get("SCHEDULE_STORE_BACKEND", "table").strip().lower()

    if backend == "cosmos":
        try:
            from shared.cosmos_store import get_cosmos_store
            store = get_cosmos_store()
            if store is not None:
                logger.info("schedule store: cosmos")
                return store
            logger.warning(
                "SCHEDULE_STORE_BACKEND=cosmos but COSMOS_CONNECTION_STRING is not set; "
                "falling back to memory"
            )
        except Exception as exc:
            logger.warning("schedule store: cosmos init failed (%s); falling back to memory", exc)
        return MemoryScheduleStore()

    if backend == "memory":
        logger.info("schedule store: memory")
        return MemoryScheduleStore()

    # Default: table storage
    try:
        from shared.table_schedule_store import get_table_schedule_store
        logger.info("schedule store: azure table storage")
        return get_table_schedule_store()
    except Exception as exc:
        logger.warning(
            "schedule store: table storage init failed (%s); falling back to memory", exc
        )
        return MemoryScheduleStore()
