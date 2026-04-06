"""Azure Function adapter — Azure resource picker lookup endpoints.

Routes (all GET, all require a valid portal JWT):
  GET /api/azure/subscriptions
  GET /api/azure/subscriptions/{sub}/resource-groups
  GET /api/azure/subscriptions/{sub}/resource-groups/{rg}/sql-vms
  GET /api/azure/subscriptions/{sub}/resource-groups/{rg}/sql-managed-instances
  GET /api/azure/subscriptions/{sub}/resource-groups/{rg}/synapse-workspaces
  GET /api/azure/subscriptions/{sub}/resource-groups/{rg}/synapse-workspaces/{ws}/sql-pools
  GET /api/azure/subscriptions/{sub}/resource-groups/{rg}/service-bus-namespaces
  GET /api/azure/subscriptions/{sub}/resource-groups/{rg}/service-bus-namespaces/{ns}/entities

All calls use the managed identity (execution credential).  The user must hold
at least the Operator role or the environment-manager role in the portal — the
same gate used for other configuration endpoints.
"""
from __future__ import annotations

import logging

import azure.functions as func
from fastapi import FastAPI, HTTPException, Request

from app.utils.cors_helper import CORSHelper
from shared.context import get_current_user
from shared.authz import has_any_role
import shared.azure_lookup as lookup

logger = logging.getLogger("function_azure_lookup")

fast_app = FastAPI()
CORSHelper.set_CORS(fast_app)


async def _require_user(req: Request) -> dict:
    try:
        user = get_current_user(req)
        if hasattr(user, "__await__"):
            user = await user
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Auth error: %s", exc)
        raise HTTPException(status_code=401, detail="Unauthorized")
    if not has_any_role(user, ["Admin", "Operator", "Viewer", "environment-manager"]):
        raise HTTPException(status_code=403, detail="Forbidden")
    return user


def _azure_error_to_http(exc: Exception) -> HTTPException:
    msg = str(exc)
    if "AuthorizationFailed" in msg or "does not have authorization" in msg.lower():
        return HTTPException(status_code=403, detail="The service identity lacks ARM Reader access on this scope.")
    if "ResourceNotFound" in msg or "not found" in msg.lower():
        return HTTPException(status_code=404, detail="Azure resource not found.")
    logger.exception("Azure lookup failed: %s", exc)
    return HTTPException(status_code=502, detail="Azure lookup failed.")


# ---------------------------------------------------------------------------
# Subscriptions
# ---------------------------------------------------------------------------

@fast_app.get("/api/azure/subscriptions")
async def get_subscriptions(req: Request):
    await _require_user(req)
    try:
        return {"subscriptions": lookup.list_subscriptions()}
    except HTTPException:
        raise
    except Exception as exc:
        raise _azure_error_to_http(exc)


# ---------------------------------------------------------------------------
# Resource groups
# ---------------------------------------------------------------------------

@fast_app.get("/api/azure/subscriptions/{subscription_id}/resource-groups")
async def get_resource_groups(subscription_id: str, req: Request):
    await _require_user(req)
    try:
        return {"resourceGroups": lookup.list_resource_groups(subscription_id)}
    except HTTPException:
        raise
    except Exception as exc:
        raise _azure_error_to_http(exc)


# ---------------------------------------------------------------------------
# SQL VMs
# ---------------------------------------------------------------------------

@fast_app.get("/api/azure/subscriptions/{subscription_id}/resource-groups/{resource_group}/sql-vms")
async def get_sql_vms(subscription_id: str, resource_group: str, req: Request):
    await _require_user(req)
    try:
        return {"sqlVms": lookup.list_sql_vms(subscription_id, resource_group)}
    except HTTPException:
        raise
    except Exception as exc:
        raise _azure_error_to_http(exc)


# ---------------------------------------------------------------------------
# SQL Managed Instances
# ---------------------------------------------------------------------------

@fast_app.get("/api/azure/subscriptions/{subscription_id}/resource-groups/{resource_group}/sql-managed-instances")
async def get_sql_managed_instances(subscription_id: str, resource_group: str, req: Request):
    await _require_user(req)
    try:
        return {"sqlManagedInstances": lookup.list_sql_managed_instances(subscription_id, resource_group)}
    except HTTPException:
        raise
    except Exception as exc:
        raise _azure_error_to_http(exc)


# ---------------------------------------------------------------------------
# Synapse workspaces
# ---------------------------------------------------------------------------

@fast_app.get("/api/azure/subscriptions/{subscription_id}/resource-groups/{resource_group}/synapse-workspaces")
async def get_synapse_workspaces(subscription_id: str, resource_group: str, req: Request):
    await _require_user(req)
    try:
        return {"synapseWorkspaces": lookup.list_synapse_workspaces(subscription_id, resource_group)}
    except HTTPException:
        raise
    except Exception as exc:
        raise _azure_error_to_http(exc)


# ---------------------------------------------------------------------------
# Synapse SQL pools
# ---------------------------------------------------------------------------

@fast_app.get(
    "/api/azure/subscriptions/{subscription_id}/resource-groups/{resource_group}"
    "/synapse-workspaces/{workspace_name}/sql-pools"
)
async def get_synapse_sql_pools(subscription_id: str, resource_group: str, workspace_name: str, req: Request):
    await _require_user(req)
    try:
        return {"sqlPools": lookup.list_synapse_sql_pools(subscription_id, resource_group, workspace_name)}
    except HTTPException:
        raise
    except Exception as exc:
        raise _azure_error_to_http(exc)


# ---------------------------------------------------------------------------
# Service Bus namespaces
# ---------------------------------------------------------------------------

@fast_app.get("/api/azure/subscriptions/{subscription_id}/resource-groups/{resource_group}/service-bus-namespaces")
async def get_service_bus_namespaces(subscription_id: str, resource_group: str, req: Request):
    await _require_user(req)
    try:
        return {"serviceBusNamespaces": lookup.list_service_bus_namespaces(subscription_id, resource_group)}
    except HTTPException:
        raise
    except Exception as exc:
        raise _azure_error_to_http(exc)


# ---------------------------------------------------------------------------
# Service Bus entities (queues + topics)
# ---------------------------------------------------------------------------

@fast_app.get(
    "/api/azure/subscriptions/{subscription_id}/resource-groups/{resource_group}"
    "/service-bus-namespaces/{namespace_name}/entities"
)
async def get_service_bus_entities(subscription_id: str, resource_group: str, namespace_name: str, req: Request):
    await _require_user(req)
    try:
        return {"entities": lookup.list_service_bus_entities(subscription_id, resource_group, namespace_name)}
    except HTTPException:
        raise
    except Exception as exc:
        raise _azure_error_to_http(exc)


# ---------------------------------------------------------------------------
# App Service (Web Apps)
# ---------------------------------------------------------------------------


@fast_app.get("/api/azure/subscriptions/{subscription_id}/resource-groups/{resource_group}/web-apps")
async def get_web_apps(subscription_id: str, resource_group: str, req: Request):
    await _require_user(req)
    try:
        return {"webApps": lookup.list_web_apps(subscription_id, resource_group)}
    except HTTPException:
        raise
    except Exception as exc:
        raise _azure_error_to_http(exc)


# ---------------------------------------------------------------------------
# Container Instances (Container Groups)
# ---------------------------------------------------------------------------


@fast_app.get("/api/azure/subscriptions/{subscription_id}/resource-groups/{resource_group}/container-groups")
async def get_container_groups(subscription_id: str, resource_group: str, req: Request):
    await _require_user(req)
    try:
        return {"containerGroups": lookup.list_container_groups(subscription_id, resource_group)}
    except HTTPException:
        raise
    except Exception as exc:
        raise _azure_error_to_http(exc)


# ---------------------------------------------------------------------------
# Azure Functions entry point
# ---------------------------------------------------------------------------

async def main(req: func.HttpRequest, context: func.Context) -> func.HttpResponse:
    return await func.AsgiMiddleware(fast_app).handle_async(req, context)
