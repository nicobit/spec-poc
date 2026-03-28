import json
import logging
import os
import requests
import azure.functions as func
from shared.audit_store import append_audit


ENV_API_URL = os.environ.get("ENV_API_URL", "http://localhost:7071/api/environments")


def process_item(item: dict):
    environment = item.get("environment")
    client = item.get("client")
    stage = item.get("stage")
    action = item.get("action")
    req_id = item.get("scheduleId")
    url = f"{ENV_API_URL}/control"
    body = {"environment": environment, "client": client, "stage": stage, "action": action, "scheduleId": req_id}
    try:
        resp = requests.post(url, json=body, timeout=10)
        resp.raise_for_status()
        append_audit({"scheduleId": req_id, "environment": environment, "client": client, "stage": stage, "action": action, "status": "success"})
        logging.info(f"Executed {action} for {environment}/{client}/{stage}: {resp.status_code}")
    except Exception as exc:
        append_audit({"scheduleId": req_id, "environment": environment, "client": client, "stage": stage, "action": action, "status": "error", "error": str(exc)})
        logging.exception("Failed to execute scheduled action")


def main(msg: func.QueueMessage) -> None:
    body = msg.get_body().decode("utf-8")
    try:
        payload = json.loads(body)
    except Exception:
        logging.error("Invalid JSON in queue message")
        return

    # payload may be a list of items or single item
    items = payload if isinstance(payload, list) else [payload]
    for it in items:
        process_item(it)
