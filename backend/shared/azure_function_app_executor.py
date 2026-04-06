"""Executor for Azure Function App lifecycle actions (start / stop).

Uses the Azure Management SDK to stop or start a Function App, then polls
the provisioning/state until the expected state is reached or the configured
timeout is exhausted.
"""
from __future__ import annotations

from typing import Any, Dict
import os
import time

from .execution_identity import build_execution_credential


def execute_function_app_action(resource_action: Dict[str, Any], execution: Dict[str, Any]) -> Dict[str, Any]:
    """Stop or start an Azure Function App and verify the resulting state.

    Parameters
    ----------
    resource_action:
        The normalised resource action dict with keys:
        - subscriptionId
        - resourceGroup
        - properties.functionAppName  (or properties.siteName as alias)
    execution:
        The parent execution dict; ``execution["action"]`` must be ``"start"`` or ``"stop"``.

    Returns a dict with operation metadata and verification fields.
    """
    from azure.mgmt.web import WebSiteManagementClient

    properties = dict(resource_action.get("properties") or {})
    subscription_id = str(resource_action.get("subscriptionId") or "").strip()
    resource_group = str(resource_action.get("resourceGroup") or "").strip()
    # accept functionAppName or fallback to siteName alias
    app_name = str(
        properties.get("functionAppName")
        or properties.get("siteName")
        or properties.get("webAppName")
        or ""
    ).strip()
    requested_action = str(execution.get("action") or "").strip().lower()

    if not subscription_id:
        raise ValueError("Function App subscriptionId is required")
    if not resource_group:
        raise ValueError("Function App resourceGroup is required")
    if not app_name:
        raise ValueError("Function App functionAppName is required")
    if requested_action not in {"start", "stop"}:
        raise ValueError("Function App execution action must be 'start' or 'stop'")

    client = WebSiteManagementClient(build_execution_credential(), subscription_id)

    if requested_action == "start":
        # Function Apps use the same web_apps surface as App Service
        client.web_apps.start(resource_group, app_name)
        operation = "start"
        expected = "running"
        message = f"Function App {app_name} start requested"
    else:
        client.web_apps.stop(resource_group, app_name)
        operation = "stop"
        expected = "stopped"
        message = f"Function App {app_name} stop requested"

    # Poll until the Function App reaches the expected state or we time out
    attempts = int(os.environ.get("FUNCTION_APP_VERIFICATION_ATTEMPTS", "10"))
    delay = int(os.environ.get("FUNCTION_APP_VERIFICATION_DELAY_SECONDS", "5"))
    verified_state = None
    verification_passed = False
    verification_attempts = 0

    for _ in range(attempts):
        verification_attempts += 1
        try:
            site = client.web_apps.get(resource_group, app_name)
            state = getattr(site, "state", None)
            if state:
                verified_state = str(state)
                if state.lower() == expected:
                    verification_passed = True
                    break
        except Exception:
            verified_state = None
        time.sleep(delay)

    verification_message = (
        f"Verified state={verified_state}"
        if verification_passed
        else f"Verification failed (state={verified_state})"
    )

    return {
        "subscriptionId": subscription_id,
        "resourceGroup": resource_group,
        "functionAppName": app_name,
        "operation": operation,
        "message": message,
        "verificationPassed": verification_passed,
        "verifiedState": verified_state,
        "verificationAttempts": verification_attempts,
        "verificationMessage": verification_message,
    }
