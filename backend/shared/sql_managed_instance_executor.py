from __future__ import annotations

from typing import Any, Dict

from .execution_identity import build_execution_credential


def execute_sql_managed_instance_action(resource_action: Dict[str, Any], execution: Dict[str, Any]) -> Dict[str, Any]:
    from azure.mgmt.sql import SqlManagementClient

    properties = dict(resource_action.get("properties") or {})
    subscription_id = str(resource_action.get("subscriptionId") or "").strip()
    resource_group = str(resource_action.get("resourceGroup") or "").strip()
    managed_instance_name = str(properties.get("managedInstanceName") or "").strip()
    requested_action = str(execution.get("action") or "").strip().lower()

    if not subscription_id:
        raise ValueError("SQL Managed Instance subscriptionId is required")
    if not resource_group:
        raise ValueError("SQL Managed Instance resourceGroup is required")
    if not managed_instance_name:
        raise ValueError("SQL Managed Instance managedInstanceName is required")
    if requested_action not in {"start", "stop"}:
        raise ValueError("SQL Managed Instance execution action must be 'start' or 'stop'")

    client = SqlManagementClient(build_execution_credential(), subscription_id)
    if requested_action == "start":
        poller = client.managed_instances.begin_start(resource_group, managed_instance_name)
        operation = "start"
        message = f"SQL Managed Instance {managed_instance_name} start requested"
    else:
        poller = client.managed_instances.begin_stop(resource_group, managed_instance_name)
        operation = "stop"
        message = f"SQL Managed Instance {managed_instance_name} stop requested"

    poller.result()

    return {
        "subscriptionId": subscription_id,
        "resourceGroup": resource_group,
        "managedInstanceName": managed_instance_name,
        "operation": operation,
        "message": message,
    }
