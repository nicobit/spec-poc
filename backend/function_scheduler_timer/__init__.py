import json
import datetime
import os
import logging
import azure.functions as func
from shared.scheduler_store import get_due_schedules as mem_get_due_schedules, mark_schedule_next_run as mem_mark_next_run
from shared.cosmos_store import get_cosmos_store

# If Cosmos DB is configured, use it; otherwise fall back to in-memory store
COSMOS_ENABLED = bool(os.environ.get("COSMOS_CONNECTION_STRING"))

cosmos = get_cosmos_store() if COSMOS_ENABLED else None

# optional azure queue client import (used when output binding is not configured)
try:
    from azure.storage.queue import QueueClient
except Exception:
    QueueClient = None

logger = logging.getLogger("function_scheduler_timer")
if not logger.handlers:
    # basic config for local logging when running under func host
    logging.basicConfig()



def main(mytimer: func.TimerRequest, outputQueueItem: func.Out[str] = None) -> None:
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
            "environment_id": s.get("environment_id"),
            "client": s.get("client"),
            "client_id": s.get("client_id"),
            "stage": s.get("stage"),
            "stage_id": s.get("stage_id"),
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
        payload = json.dumps(messages)
        # Prefer platform binding if available (used by tests and Functions output binding)
        if outputQueueItem is not None:
            try:
                outputQueueItem.set(payload)
            except Exception as e:
                logger.exception("Failed to set output binding for schedule messages: %s", e)
        else:
            # Attempt to send programmatically if Azure storage is configured.
            conn_str = os.environ.get("AzureWebJobsStorage") or os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
            if conn_str and QueueClient is not None:
                try:
                    queue_client = QueueClient.from_connection_string(conn_str, queue_name="env-schedule-queue")
                    # ensure queue exists
                    queue_client.create_queue()
                    queue_client.send_message(payload)
                except Exception:
                    logger.exception("Failed to enqueue schedule messages via QueueClient; continuing without crashing.")
            else:
                logger.warning("No output binding and no queue client available; messages dropped: %s", payload)


import sys
__init__ = sys.modules[__name__]
