from __future__ import annotations

from typing import Any, Dict
import os
import time

from .execution_identity import build_execution_credential


def execute_app_service_action(resource_action: Dict[str, Any], execution: Dict[str, Any]) -> Dict[str, Any]:
    from azure.mgmt.web import WebSiteManagementClient

    properties = dict(resource_action.get("properties") or {})
    subscription_id = str(resource_action.get("subscriptionId") or "").strip()
    resource_group = str(resource_action.get("resourceGroup") or "").strip()
    site_name = str(properties.get("siteName") or properties.get("webAppName") or "").strip()
    requested_action = str(execution.get("action") or "").strip().lower()

    if not subscription_id:
        raise ValueError("App Service subscriptionId is required")
    if not resource_group:
        raise ValueError("App Service resourceGroup is required")
    if not site_name:
        raise ValueError("App Service siteName is required")
    if requested_action not in {"start", "stop"}:
        raise ValueError("App Service execution action must be 'start' or 'stop'")

    client = WebSiteManagementClient(build_execution_credential(), subscription_id)
    if requested_action == "start":
        # Use begin_start when available (newer SDKs return a poller),
        # otherwise fall back to the synchronous start() method.
        try:
            poller = client.web_apps.begin_start(resource_group, site_name)
            poller.result()
            operation = "start"
            message = f"App Service {site_name} start requested"
        except AttributeError:
            client.web_apps.start(resource_group, site_name)
            operation = "start"
            message = f"App Service {site_name} start requested (sync)"
    else:
        try:
            poller = client.web_apps.begin_stop(resource_group, site_name)
            poller.result()
            operation = "stop"
            message = f"App Service {site_name} stop requested"
        except AttributeError:
            client.web_apps.stop(resource_group, site_name)
            operation = "stop"
            message = f"App Service {site_name} stop requested (sync)"
    # synchronous verification: poll the app service state until it matches expected or timeout
    attempts = int(os.environ.get("APP_SERVICE_VERIFICATION_ATTEMPTS", "5"))
    delay = int(os.environ.get("APP_SERVICE_VERIFICATION_DELAY_SECONDS", "3"))
    verified_state = None
    verification_passed = False
    verification_attempts = 0
    expected = "running" if operation == "start" else "stopped"
    for i in range(attempts):
        verification_attempts += 1
        try:
            site = client.web_apps.get(resource_group, site_name)
            state = getattr(site, "state", None)
            if state:
                verified_state = str(state)
                if state.lower() == expected:
                    verification_passed = True
                    break
        except Exception:
            # swallow and retry
            verified_state = None
        time.sleep(delay)

    verification_message = (
        f"Verified state={verified_state}" if verification_passed else f"Verification failed (state={verified_state})"
    )

    return {
        "subscriptionId": subscription_id,
        "resourceGroup": resource_group,
        "siteName": site_name,
        "operation": operation,
        "message": message,
        "verificationPassed": verification_passed,
        "verifiedState": verified_state,
        "verificationAttempts": verification_attempts,
        "verificationMessage": verification_message,
    }
