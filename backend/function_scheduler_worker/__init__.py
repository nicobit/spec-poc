import json
import logging
import os
import requests
import azure.functions as func
from shared.audit_store import append_audit


ENV_API_URL = os.environ.get("ENV_API_URL", "http://localhost:7071/api/environments")


def process_item(item: dict):
    environment = item.get("environment")
    environment_id = item.get("environment_id")
    client = item.get("client")
    client_id = item.get("client_id")
    stage = item.get("stage")
    stage_id = item.get("stage_id")
    action = item.get("action")
    req_id = item.get("scheduleId")
    url = f"{ENV_API_URL}/control"
    body = {
        "environment": environment,
        "environment_id": environment_id,
        "client": client,
        "client_id": client_id,
        "stage": stage,
        "stage_id": stage_id,
        "action": action,
        "scheduleId": req_id,
    }
    try:
        resp = requests.post(url, json=body, timeout=10)
        resp.raise_for_status()
        append_audit(
            {
                "scheduleId": req_id,
                "environment": environment_id or environment,
                "client": client_id or client,
                "stage": stage_id or stage,
                "action": action,
                "status": "success",
            }
        )
        logging.info(
            "Executed %s for environment=%s client=%s stage=%s: %s",
            action,
            environment_id or environment,
            client_id or client,
            stage_id or stage,
            resp.status_code,
        )
    except Exception as exc:
        error_detail = str(exc)
        if "resp" in locals():
            try:
                error_detail = f"{error_detail} | response={resp.text}"
            except Exception:
                pass
        append_audit(
            {
                "scheduleId": req_id,
                "environment": environment_id or environment,
                "client": client_id or client,
                "stage": stage_id or stage,
                "action": action,
                "status": "error",
                "error": error_detail,
            }
        )
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
