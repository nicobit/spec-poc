"""Run a simple scheduler simulator that calls the environment API for due schedules.

This script does not require Azure Functions Core Tools. It:
- loads the in-memory schedules from `backend.shared.scheduler_store`
- for each due schedule, calls the environment control endpoint
- records audit entries via `backend.shared.audit_store`

Usage:
  python scripts/run_scheduler_simulator.py

Ensure the environment API is running locally on port 7071:
  python -m uvicorn backend.function_environment.__init__:fast_app --port 7071
"""
import json
import logging
import os
from datetime import datetime
import requests

from shared.scheduler_store import get_due_schedules, mark_schedule_next_run
from shared.audit_store import append_audit

ENV_API_URL = os.environ.get("ENV_API_URL", "http://localhost:7071/api/environments")


def main():
    now = datetime.utcnow()
    due = get_due_schedules(now)
    if not due:
        print("No due schedules")
        return

    for s in due:
        environment = s.get("environment")
        client = s.get("client")
        stage = s.get("stage")
        action = s.get("action")
        schedule_id = s.get("id")
        url = f"{ENV_API_URL}/control"
        body = {"environment": environment, "client": client, "stage": stage, "action": action, "scheduleId": schedule_id}
        print(f"Calling {url} with {body}")
        try:
            r = requests.post(url, json=body, timeout=10)
            r.raise_for_status()
            append_audit({"scheduleId": schedule_id, "environment": environment, "client": client, "stage": stage, "action": action, "status": "success", "response": r.json() if r.headers.get('content-type','').startswith('application/json') else r.text})
            print(f"Success: {r.status_code}")
        except Exception as e:
            append_audit({"scheduleId": schedule_id, "environment": environment, "client": client, "stage": stage, "action": action, "status": "error", "error": str(e)})
            print(f"Error: {e}")
        # mark next run +1 hour as placeholder
        mark_schedule_next_run(schedule_id, now.replace(microsecond=0) + __import__('datetime').timedelta(hours=1))


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    main()
