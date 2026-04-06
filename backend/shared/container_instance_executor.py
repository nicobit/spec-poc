from __future__ import annotations

from typing import Any, Dict

from .execution_identity import build_execution_credential
import os
import time


def execute_container_instance_action(resource_action: Dict[str, Any], execution: Dict[str, Any]) -> Dict[str, Any]:
    from azure.mgmt.containerinstance import ContainerInstanceManagementClient

    properties = dict(resource_action.get("properties") or {})
    subscription_id = str(resource_action.get("subscriptionId") or "").strip()
    resource_group = str(resource_action.get("resourceGroup") or "").strip()
    group_name = str(properties.get("containerGroupName") or properties.get("groupName") or "").strip()
    requested_action = str(execution.get("action") or "").strip().lower()

    if not subscription_id:
        raise ValueError("Container Instance subscriptionId is required")
    if not resource_group:
        raise ValueError("Container Instance resourceGroup is required")
    if not group_name:
        raise ValueError("Container Instance containerGroupName is required")
    if requested_action not in {"start", "stop"}:
        raise ValueError("Container Instance execution action must be 'start' or 'stop'")

    client = ContainerInstanceManagementClient(build_execution_credential(), subscription_id)
    if requested_action == "start":
        poller = client.container_groups.begin_start(resource_group, group_name)
        operation = "start"
        message = f"Container group {group_name} start requested"
    else:
        # stop maps to 'stop' operation (may deallocate underlying compute)
        poller = client.container_groups.begin_stop(resource_group, group_name)
        operation = "stop"
        message = f"Container group {group_name} stop requested"

    poller.result()
    # synchronous verification: poll container group state until it reports expected state
    attempts = int(os.environ.get("CONTAINER_INSTANCE_VERIFICATION_ATTEMPTS", "5"))
    delay = int(os.environ.get("CONTAINER_INSTANCE_VERIFICATION_DELAY_SECONDS", "3"))
    verified_state = None
    verification_passed = False
    verification_attempts = 0
    expected = "running" if operation == "start" else "stopped"
    for i in range(attempts):
        verification_attempts += 1
        try:
            group = client.container_groups.get(resource_group, group_name)
            # Try instance_view first
            instance_view = getattr(group, "instance_view", None)
            if instance_view and getattr(instance_view, "state", None):
                verified_state = getattr(instance_view, "state")
            else:
                # Fallback: inspect containers' current state
                containers = getattr(group, "containers", None) or []
                found = None
                for c in containers:
                    inst_view = getattr(c, "instance_view", None)
                    if inst_view and getattr(inst_view, "current_state", None):
                        cs = getattr(inst_view.current_state, "state", None)
                        if cs:
                            found = cs
                            break
                if found:
                    verified_state = found
                else:
                    # last fallback: provisioning state
                    verified_state = getattr(group, "provisioning_state", None)

            if verified_state and str(verified_state).lower() == expected:
                verification_passed = True
                break
        except Exception:
            verified_state = None
        time.sleep(delay)

    verification_message = (
        f"Verified state={verified_state}" if verification_passed else f"Verification failed (state={verified_state})"
    )

    return {
        "subscriptionId": subscription_id,
        "resourceGroup": resource_group,
        "containerGroupName": group_name,
        "operation": operation,
        "message": message,
        "verificationPassed": verification_passed,
        "verifiedState": verified_state,
        "verificationAttempts": verification_attempts,
        "verificationMessage": verification_message,
    }
