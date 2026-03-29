from __future__ import annotations

from typing import Any, Dict

from .execution_identity import build_execution_credential


def execute_sql_vm_lifecycle_action(resource_action: Dict[str, Any], execution: Dict[str, Any]) -> Dict[str, Any]:
    from azure.mgmt.compute import ComputeManagementClient

    properties = dict(resource_action.get("properties") or {})
    subscription_id = str(resource_action.get("subscriptionId") or "").strip()
    resource_group = str(resource_action.get("resourceGroup") or "").strip()
    vm_name = str(properties.get("vmName") or "").strip()
    requested_action = str(execution.get("action") or "").strip().lower()

    if not subscription_id:
        raise ValueError("SQL VM subscriptionId is required")
    if not resource_group:
        raise ValueError("SQL VM resourceGroup is required")
    if not vm_name:
        raise ValueError("SQL VM vmName is required")
    if requested_action not in {"start", "stop"}:
        raise ValueError("SQL VM execution action must be 'start' or 'stop'")

    client = ComputeManagementClient(build_execution_credential(), subscription_id)
    if requested_action == "start":
        poller = client.virtual_machines.begin_start(resource_group, vm_name)
        operation = "start"
        message = f"SQL VM {vm_name} start requested"
    else:
        poller = client.virtual_machines.begin_deallocate(resource_group, vm_name)
        operation = "deallocate"
        message = f"SQL VM {vm_name} deallocate requested"

    poller.result()

    return {
        "subscriptionId": subscription_id,
        "resourceGroup": resource_group,
        "vmName": vm_name,
        "operation": operation,
        "message": message,
    }
