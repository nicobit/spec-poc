from __future__ import annotations

import json
import logging
import os
import time
from typing import Any, Dict

import azure.functions as func
from shared.execution_store import get_stage_execution_store, list_executions_needing_verification, upsert_stage_execution
from shared.audit_store import append_audit


def _verify_app_service(client, resource_result: Dict[str, Any], action_props: Dict[str, Any]) -> Dict[str, Any]:
    resource_group = resource_result.get("resourceGroup") or action_props.get("resourceGroup")
    site_name = action_props.get("siteName") or action_props.get("webAppName") or resource_result.get("resourceIdentifier")
    expected = "running" if (resource_result.get("operation") or "").lower() == "start" else "stopped"
    attempts = int(os.environ.get("APP_SERVICE_VERIFICATION_ATTEMPTS", "5"))
    delay = int(os.environ.get("APP_SERVICE_VERIFICATION_DELAY_SECONDS", "3"))
    verified_state = None
    passed = False
    attempts_done = 0
    from azure.mgmt.web import WebSiteManagementClient

    client = WebSiteManagementClient(client, resource_result.get("subscriptionId")) if not isinstance(client, WebSiteManagementClient) else client
    for i in range(attempts):
        attempts_done += 1
        try:
            site = client.web_apps.get(resource_group, site_name)
            state = getattr(site, "state", None)
            if state:
                verified_state = str(state)
                if verified_state.lower() == expected:
                    passed = True
                    break
        except Exception:
            verified_state = None
        time.sleep(delay)

    return {
        "verificationPassed": passed,
        "verifiedState": verified_state,
        "verificationAttempts": attempts_done,
    }


def _verify_container_instance(client, resource_result: Dict[str, Any], action_props: Dict[str, Any]) -> Dict[str, Any]:
    resource_group = resource_result.get("resourceGroup") or action_props.get("resourceGroup")
    group_name = action_props.get("containerGroupName") or action_props.get("groupName") or resource_result.get("resourceIdentifier")
    expected = "running" if (resource_result.get("operation") or "").lower() == "start" else "stopped"
    attempts = int(os.environ.get("CONTAINER_INSTANCE_VERIFICATION_ATTEMPTS", "5"))
    delay = int(os.environ.get("CONTAINER_INSTANCE_VERIFICATION_DELAY_SECONDS", "3"))
    verified_state = None
    passed = False
    attempts_done = 0
    from azure.mgmt.containerinstance import ContainerInstanceManagementClient

    client = ContainerInstanceManagementClient(client, resource_result.get("subscriptionId")) if not isinstance(client, ContainerInstanceManagementClient) else client
    for i in range(attempts):
        attempts_done += 1
        try:
            group = client.container_groups.get(resource_group, group_name)
            instance_view = getattr(group, "instance_view", None)
            if instance_view and getattr(instance_view, "state", None):
                verified_state = getattr(instance_view, "state")
            else:
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
                    verified_state = getattr(group, "provisioning_state", None)

            if verified_state and str(verified_state).lower() == expected:
                passed = True
                break
        except Exception:
            verified_state = None
        time.sleep(delay)

    return {
        "verificationPassed": passed,
        "verifiedState": verified_state,
        "verificationAttempts": attempts_done,
    }


def main(req: func.HttpRequest) -> func.HttpResponse:
    """HTTP-triggered verifier — scans recent executions needing verification and updates them."""
    try:
        store_proxy = get_stage_execution_store()
        # We will create a real store instance if COSMOS configured, otherwise use in-memory lists
        executions = list_executions_needing_verification = None
        from shared.execution_store import list_executions_needing_verification as _list
        executions = _list()

        if not executions:
            return func.HttpResponse(json.dumps({"updated": 0, "scanned": 0}), status_code=200)

        updated = 0
        # Build Azure credential for SDKs
        # We reuse build_execution_credential if available
        from shared.execution_identity import build_execution_credential
        cred = build_execution_credential()

        for exe in executions:
            changed = False
            ras = exe.get("resourceActionResults") or []
            # For each resource action result that is not verified, attempt verification
            for idx, r in enumerate(ras):
                if r.get("verificationPassed") is True:
                    continue
                # derive action properties — best-effort
                action_props = {}
                # attempt to read properties from execution or result
                # Prefer resourceActionResults containing operation and identifier
                typ = (r.get("type") or "").lower()
                if typ in ("app-service", "web-app", "appservice"):
                    try:
                        res = _verify_app_service(cred, r, action_props)
                        ras[idx].update(res)
                        changed = True
                    except Exception as e:
                        logging.exception("Verifier error for app service: %s", e)
                elif typ in ("container-instance", "containerinstance", "aci"):
                    try:
                        res = _verify_container_instance(cred, r, action_props)
                        ras[idx].update(res)
                        changed = True
                    except Exception as e:
                        logging.exception("Verifier error for container instance: %s", e)
                else:
                    # not supported yet — skip
                    continue

            if changed:
                exe["resourceActionResults"] = ras
                try:
                    upsert_stage_execution(exe)
                    append_audit({
                        "executionId": exe.get("executionId"),
                        "environment": exe.get("environmentId"),
                        "stage": exe.get("stageId"),
                        "action": exe.get("action"),
                        "status": exe.get("status"),
                        "note": "verification_reconciled",
                    })
                    updated += 1
                except Exception:
                    logging.exception("Failed to persist verification updates for execution %s", exe.get("executionId"))

        return func.HttpResponse(json.dumps({"updated": updated, "scanned": len(executions)}), status_code=200)
    except Exception as exc:
        logging.exception("Verifier run failed: %s", exc)
        return func.HttpResponse(json.dumps({"error": str(exc)}), status_code=500)
