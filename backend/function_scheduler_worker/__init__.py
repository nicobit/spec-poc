import json
import logging
import os
from datetime import datetime, timezone

import requests
import azure.functions as func
from shared.audit_store import append_audit
from shared.execution_store import (
    get_stage_execution_store,
    upsert_stage_execution,
)
from shared.resource_action_contract import describe_resource_action, normalize_resource_action, validate_resource_action
from shared.service_bus_executor import execute_service_bus_message
from shared.sql_managed_instance_executor import execute_sql_managed_instance_action
from shared.sql_vm_executor import execute_sql_vm_lifecycle_action
from shared.synapse_sql_pool_executor import execute_synapse_sql_pool_action


ENV_API_URL = os.environ.get("ENV_API_URL", "http://localhost:7071/api/environments")
execution_store = get_stage_execution_store()


def _utc_now_iso_z() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _persist_execution(record: dict):
    if execution_store:
        try:
            execution_store.upsert_stage_execution(record)
            return
        except Exception:
            logging.exception("Failed to persist stage execution to Cosmos; falling back to in-memory store")
    upsert_stage_execution(record)


def _save_execution(record: dict, **updates):
    updated = dict(record)
    updated.update(updates)
    _persist_execution(updated)
    return updated


def _load_stage_details(environment_id: str, stage_id: str | None, stage_label: str | None):
    resp = requests.get(f"{ENV_API_URL}/{environment_id}", timeout=10)
    resp.raise_for_status()
    environment = resp.json()
    stages = environment.get("stages") or []
    resolved_stage = None
    if stage_id:
        resolved_stage = next((item for item in stages if item.get("id") == stage_id), None)
    if not resolved_stage and stage_label:
        needle = str(stage_label).lower()
        resolved_stage = next(
            (item for item in stages if str(item.get("id") or "").lower() == needle or str(item.get("name") or "").lower() == needle),
            None,
        )
    if not resolved_stage:
        raise ValueError("Stage not found for execution")
    return environment, resolved_stage


def process_item(item: dict):
    environment = item.get("environment")
    environment_id = item.get("environment_id")
    client = item.get("client")
    client_id = item.get("client_id")
    stage = item.get("stage")
    stage_id = item.get("stage_id")
    action = item.get("action")
    req_id = item.get("scheduleId")
    execution_id = item.get("executionId") or f"exec-missing-{req_id or 'unknown'}"
    requested_at = item.get("requestedAt") or _utc_now_iso_z()
    requested_by = item.get("requestedBy")
    correlation_id = item.get("correlationId")

    execution = {
        "id": execution_id,
        "executionId": execution_id,
        "clientId": client_id or client or "unknown-client",
        "environmentId": environment_id or environment or "unknown-environment",
        "stageId": stage_id or stage or "unknown-stage",
        "scheduleId": req_id,
        "action": action,
        "source": "schedule",
        "requestedAt": requested_at,
        "requestedBy": requested_by,
        "status": "pending",
        "resourceActionResults": [],
        "correlationId": correlation_id,
        "environmentName": environment,
        "stageName": stage,
    }
    execution = _save_execution(execution)

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
        "executionId": execution_id,
        "requestedAt": requested_at,
        "requestedBy": requested_by,
        "correlationId": correlation_id,
    }
    try:
        if not environment_id:
            raise ValueError("Missing required environment_id for scheduled execution")

        execution = _save_execution(execution, status="in_progress", startedAt=_utc_now_iso_z())
        environment_details, stage_details = _load_stage_details(environment_id, stage_id, stage)
        resource_actions = [normalize_resource_action(action_item) for action_item in (stage_details.get("resourceActions") or [])]

        resource_results = []
        validation_errors = []
        for action_item in resource_actions:
            is_valid, missing = validate_resource_action(action_item)
            result = {
                "resourceActionId": action_item.get("id") or action_item.get("type") or "resource-action",
                "type": action_item.get("type") or "unknown",
                "status": "pending" if is_valid else "failed",
                "subscriptionId": action_item.get("subscriptionId"),
                "region": action_item.get("region"),
                "resourceIdentifier": describe_resource_action(action_item),
                "message": None if is_valid else f"Missing required fields: {', '.join(missing)}",
                "errorCode": None if is_valid else "invalid_resource_action",
            }
            resource_results.append(result)
            if not is_valid:
                validation_errors.append(result["message"])

        execution = _save_execution(
            execution,
            clientId=environment_details.get("clientId") or execution.get("clientId"),
            environmentName=environment_details.get("name") or execution.get("environmentName"),
            stageId=stage_details.get("id") or execution.get("stageId"),
            stageName=stage_details.get("name") or execution.get("stageName"),
            resourceActionResults=resource_results,
        )

        if not resource_actions:
            message = "No executable resource actions configured for stage"
            execution = _save_execution(
                execution,
                completedAt=_utc_now_iso_z(),
                status="failed",
                message=message,
            )
            append_audit(
                {
                    "scheduleId": req_id,
                    "executionId": execution_id,
                    "environment": environment_id or environment,
                    "client": client_id or client,
                    "stage": stage_id or stage,
                    "action": action,
                    "status": "error",
                    "error": message,
                }
            )
            logging.error(message)
            return

        if validation_errors:
            message = "; ".join(validation_errors)
            execution = _save_execution(
                execution,
                completedAt=_utc_now_iso_z(),
                status="failed",
                message=message,
            )
            append_audit(
                {
                    "scheduleId": req_id,
                    "executionId": execution_id,
                    "environment": environment_id or environment,
                    "client": client_id or client,
                    "stage": stage_id or stage,
                    "action": action,
                    "status": "error",
                    "error": message,
                }
            )
            logging.error("Stage execution validation failed: %s", message)
            return

        resource_results_by_id = {
            item_result.get("resourceActionId"): dict(item_result)
            for item_result in execution.get("resourceActionResults", [])
        }

        sql_vm_actions = []
        sql_managed_instance_actions = []
        synapse_sql_pool_actions = []
        service_bus_actions = []
        delegated_actions = []
        for action_item in resource_actions:
            if action_item.get("type") == "sql-vm":
                sql_vm_actions.append(action_item)
            elif action_item.get("type") == "sql-managed-instance":
                sql_managed_instance_actions.append(action_item)
            elif action_item.get("type") == "synapse-sql-pool":
                synapse_sql_pool_actions.append(action_item)
            elif action_item.get("type") == "service-bus-message":
                service_bus_actions.append(action_item)
            else:
                delegated_actions.append(action_item)

        for action_item in sql_vm_actions:
            action_result = resource_results_by_id.get(action_item.get("id")) or {}
            started_at = _utc_now_iso_z()
            try:
                lifecycle = execute_sql_vm_lifecycle_action(action_item, execution)
                resource_results_by_id[action_item.get("id")] = {
                    **action_result,
                    "status": "succeeded",
                    "startedAt": started_at,
                    "completedAt": _utc_now_iso_z(),
                    "message": lifecycle.get("message"),
                    "resourceIdentifier": lifecycle.get("vmName") or action_result.get("resourceIdentifier"),
                    "errorCode": None,
                }
            except Exception as lifecycle_exc:
                resource_results_by_id[action_item.get("id")] = {
                    **action_result,
                    "status": "failed",
                    "startedAt": started_at,
                    "completedAt": _utc_now_iso_z(),
                    "message": str(lifecycle_exc),
                    "errorCode": "sql_vm_execution_failed",
                }

        for action_item in sql_managed_instance_actions:
            action_result = resource_results_by_id.get(action_item.get("id")) or {}
            started_at = _utc_now_iso_z()
            try:
                lifecycle = execute_sql_managed_instance_action(action_item, execution)
                resource_results_by_id[action_item.get("id")] = {
                    **action_result,
                    "status": "succeeded",
                    "startedAt": started_at,
                    "completedAt": _utc_now_iso_z(),
                    "message": lifecycle.get("message"),
                    "resourceIdentifier": lifecycle.get("managedInstanceName") or action_result.get("resourceIdentifier"),
                    "errorCode": None,
                }
            except Exception as lifecycle_exc:
                resource_results_by_id[action_item.get("id")] = {
                    **action_result,
                    "status": "failed",
                    "startedAt": started_at,
                    "completedAt": _utc_now_iso_z(),
                    "message": str(lifecycle_exc),
                    "errorCode": "sql_managed_instance_execution_failed",
                }

        for action_item in synapse_sql_pool_actions:
            action_result = resource_results_by_id.get(action_item.get("id")) or {}
            started_at = _utc_now_iso_z()
            try:
                lifecycle = execute_synapse_sql_pool_action(action_item, execution)
                resource_results_by_id[action_item.get("id")] = {
                    **action_result,
                    "status": "succeeded",
                    "startedAt": started_at,
                    "completedAt": _utc_now_iso_z(),
                    "message": lifecycle.get("message"),
                    "resourceIdentifier": "/".join(
                        [
                            value
                            for value in (
                                lifecycle.get("workspaceName"),
                                lifecycle.get("sqlPoolName"),
                            )
                            if value
                        ]
                    )
                    or action_result.get("resourceIdentifier"),
                    "errorCode": None,
                }
            except Exception as lifecycle_exc:
                resource_results_by_id[action_item.get("id")] = {
                    **action_result,
                    "status": "failed",
                    "startedAt": started_at,
                    "completedAt": _utc_now_iso_z(),
                    "message": str(lifecycle_exc),
                    "errorCode": "synapse_sql_pool_execution_failed",
                }

        for action_item in service_bus_actions:
            action_result = resource_results_by_id.get(action_item.get("id")) or {}
            started_at = _utc_now_iso_z()
            try:
                dispatch = execute_service_bus_message(action_item, execution)
                resource_results_by_id[action_item.get("id")] = {
                    **action_result,
                    "status": "succeeded",
                    "startedAt": started_at,
                    "completedAt": _utc_now_iso_z(),
                    "message": dispatch.get("message"),
                    "resourceIdentifier": dispatch.get("entityName") or action_result.get("resourceIdentifier"),
                    "errorCode": None,
                }
            except Exception as dispatch_exc:
                resource_results_by_id[action_item.get("id")] = {
                    **action_result,
                    "status": "failed",
                    "startedAt": started_at,
                    "completedAt": _utc_now_iso_z(),
                    "message": str(dispatch_exc),
                    "errorCode": "service_bus_dispatch_failed",
                }

        delegated_error = None
        if delegated_actions:
            resp = requests.post(url, json=body, timeout=10)
            try:
                resp.raise_for_status()
            except Exception as delegate_exc:
                try:
                    delegated_error = f"{delegate_exc} | response={resp.text}"
                except Exception:
                    delegated_error = str(delegate_exc)
            if delegated_error:
                for action_item in delegated_actions:
                    action_result = resource_results_by_id.get(action_item.get("id")) or {}
                    resource_results_by_id[action_item.get("id")] = {
                        **action_result,
                        "status": "failed",
                        "completedAt": _utc_now_iso_z(),
                        "message": delegated_error,
                        "errorCode": action_result.get("errorCode") or "execution_failed",
                    }
            else:
                for action_item in delegated_actions:
                    action_result = resource_results_by_id.get(action_item.get("id")) or {}
                    resource_results_by_id[action_item.get("id")] = {
                        **action_result,
                        "status": "succeeded",
                        "completedAt": _utc_now_iso_z(),
                        "message": "Delegated successfully to control endpoint",
                        "errorCode": None,
                    }

        finalized_results = list(resource_results_by_id.values())
        success_count = sum(1 for result in finalized_results if result.get("status") == "succeeded")
        failure_count = sum(1 for result in finalized_results if result.get("status") == "failed")
        if failure_count == 0:
            final_status = "succeeded"
            final_message = "Execution completed successfully"
        elif success_count > 0:
            final_status = "partially_failed"
            final_message = "Execution completed with partial failures"
        else:
            final_status = "failed"
            final_message = "Execution failed"

        execution = _save_execution(
            execution,
            completedAt=_utc_now_iso_z(),
            status=final_status,
            resourceActionResults=finalized_results,
            message=final_message,
        )
        append_audit(
            {
                "scheduleId": req_id,
                "executionId": execution_id,
                "environment": environment_id or environment,
                "client": client_id or client,
                "stage": stage_id or stage,
                "action": action,
                "status": final_status,
            }
        )
        logging.info(
            "Executed %s for environment=%s client=%s stage=%s: %s",
            action,
            environment_id or environment,
            client_id or client,
            stage_id or stage,
            final_status,
        )
    except Exception as exc:
        error_detail = str(exc)
        if "resp" in locals():
            try:
                error_detail = f"{error_detail} | response={resp.text}"
            except Exception:
                pass
        failed_results = []
        for result in execution.get("resourceActionResults", []):
            failed_results.append(
                {
                    **result,
                    "status": "failed",
                    "completedAt": _utc_now_iso_z(),
                    "message": error_detail,
                    "errorCode": result.get("errorCode") or "execution_failed",
                }
            )
        execution = _save_execution(
            execution,
            completedAt=_utc_now_iso_z(),
            status="failed",
            resourceActionResults=failed_results,
            message=error_detail,
        )
        append_audit(
            {
                "scheduleId": req_id,
                "executionId": execution_id,
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
