import json
import datetime
import os
import logging
import uuid
import azure.functions as func
from shared.schedule_store import get_schedule_store

# optional azure queue client import (used when output binding is not configured)
try:
    from azure.storage.queue import QueueClient
except Exception:
    QueueClient = None

schedule_store = get_schedule_store()

logger = logging.getLogger("function_scheduler_timer")
if not logger.handlers:
    # basic config for local logging when running under func host
    logging.basicConfig()


def _utc_now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def _utc_now_iso_z() -> str:
    return _utc_now().isoformat().replace("+00:00", "Z")



def main(mytimer: func.TimerRequest, outputQueueItem: func.Out[str] = None) -> None:
    now = _utc_now()
    now_iso = now.isoformat()
    due = schedule_store.get_due_schedules(now_iso)
    messages = []
    for s in due:
        msg = {
            "executionId": f"exec-{uuid.uuid4().hex[:12]}",
            "scheduleId": s.get("id"),
            "environment": s.get("environment"),
            "environment_id": s.get("environment_id"),
            "client": s.get("client"),
            "client_id": s.get("client_id"),
            "stage": s.get("stage"),
            "stage_id": s.get("stage_id"),
            "action": s.get("action"),
            "requestedBy": s.get("owner") or "system",
            "requestedAt": _utc_now_iso_z(),
        }
        messages.append(msg)
        # mark next_run +1 hour as placeholder (real cron calculation later)
        next_run = now + datetime.timedelta(hours=1)
        schedule_store.mark_next_run(s.get("id"), next_run.isoformat())

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
