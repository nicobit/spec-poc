import json
import datetime
import os
import azure.functions as func
from shared.scheduler_store import get_due_schedules as mem_get_due_schedules, mark_schedule_next_run as mem_mark_next_run
from shared.cosmos_store import get_cosmos_store

# If Cosmos DB is configured, use it; otherwise fall back to in-memory store
COSMOS_ENABLED = bool(os.environ.get("COSMOS_CONNECTION_STRING"))

cosmos = get_cosmos_store() if COSMOS_ENABLED else None



def main(mytimer: func.TimerRequest, outputQueueItem: func.Out[str]) -> None:
    now = datetime.datetime.utcnow()
    now_iso = now.isoformat()
    # Prefer in-memory schedules when present (useful for tests). If none,
    # fall back to Cosmos when configured.
    try:
        import shared as _mem_pkg
        _mem = _mem_pkg.scheduler_store
        mem_has = bool(_mem.SCHEDULES)
    except Exception:
        mem_has = False
    if mem_has:
        due = mem_get_due_schedules(now)
    elif cosmos:
        due = cosmos.get_due_schedules(now_iso)
    else:
        due = mem_get_due_schedules(now)
    messages = []
    for s in due:
        msg = {
            "scheduleId": s.get("id"),
            "environment": s.get("environment"),
            "client": s.get("client"),
            "stage": s.get("stage"),
            "action": s.get("action"),
            "requestedBy": s.get("owner") or "system",
            "requestedAt": now.isoformat() + "Z",
        }
        messages.append(msg)
        # mark next_run +1 hour as placeholder (real cron calculation later)
        next_run = now + datetime.timedelta(hours=1)
        if cosmos:
            cosmos.mark_next_run(s.get("id"), next_run.isoformat())
        else:
            mem_mark_next_run(s.get("id"), next_run)

    if messages:
        # send as single JSON payload; worker will iterate
        outputQueueItem.set(json.dumps(messages))


import sys
__init__ = sys.modules[__name__]
