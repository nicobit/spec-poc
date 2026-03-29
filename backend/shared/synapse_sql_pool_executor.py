from __future__ import annotations

from typing import Any, Dict

from .execution_identity import build_execution_credential


def execute_synapse_sql_pool_action(resource_action: Dict[str, Any], execution: Dict[str, Any]) -> Dict[str, Any]:
    from azure.mgmt.synapse import SynapseManagementClient

    properties = dict(resource_action.get("properties") or {})
    subscription_id = str(resource_action.get("subscriptionId") or "").strip()
    resource_group = str(resource_action.get("resourceGroup") or "").strip()
    workspace_name = str(properties.get("workspaceName") or "").strip()
    sql_pool_name = str(properties.get("sqlPoolName") or "").strip()
    requested_action = str(execution.get("action") or "").strip().lower()

    if not subscription_id:
        raise ValueError("Synapse SQL pool subscriptionId is required")
    if not resource_group:
        raise ValueError("Synapse SQL pool resourceGroup is required")
    if not workspace_name:
        raise ValueError("Synapse SQL pool workspaceName is required")
    if not sql_pool_name:
        raise ValueError("Synapse SQL pool sqlPoolName is required")
    if requested_action not in {"start", "stop"}:
        raise ValueError("Synapse SQL pool execution action must be 'start' or 'stop'")

    client = SynapseManagementClient(build_execution_credential(), subscription_id)
    if requested_action == "start":
        poller = client.sql_pools.begin_resume(resource_group, workspace_name, sql_pool_name)
        operation = "resume"
        message = f"Synapse SQL pool {workspace_name}/{sql_pool_name} resume requested"
    else:
        poller = client.sql_pools.begin_pause(resource_group, workspace_name, sql_pool_name)
        operation = "pause"
        message = f"Synapse SQL pool {workspace_name}/{sql_pool_name} pause requested"

    poller.result()

    return {
        "subscriptionId": subscription_id,
        "resourceGroup": resource_group,
        "workspaceName": workspace_name,
        "sqlPoolName": sql_pool_name,
        "operation": operation,
        "message": message,
    }
