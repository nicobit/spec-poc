"""Azure resource lookup helpers for configuration-time pickers.

All calls use the managed identity / execution credential (Option A), so the
returned resource lists are scoped to whatever ARM Reader permissions the
service identity holds.  This is the same credential used by the stage executors.

Public API
----------
list_subscriptions() -> list[dict]
list_resource_groups(subscription_id) -> list[dict]
list_sql_vms(subscription_id, resource_group) -> list[dict]
list_sql_managed_instances(subscription_id, resource_group) -> list[dict]
list_synapse_workspaces(subscription_id, resource_group) -> list[dict]
list_synapse_sql_pools(subscription_id, resource_group, workspace_name) -> list[dict]
list_service_bus_namespaces(subscription_id, resource_group) -> list[dict]
list_service_bus_entities(subscription_id, resource_group, namespace_name) -> list[dict]
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List

from .execution_identity import build_execution_credential

_log = logging.getLogger(__name__)


def _cred():
    return build_execution_credential()


# ---------------------------------------------------------------------------
# Subscriptions
# ---------------------------------------------------------------------------

def list_subscriptions() -> List[Dict[str, Any]]:
    from azure.mgmt.subscription import SubscriptionClient

    client = SubscriptionClient(_cred())
    results = []
    for sub in client.subscriptions.list():
        results.append({
            "subscriptionId": sub.subscription_id,
            "displayName": sub.display_name,
            "state": str(sub.state) if sub.state else None,
        })
    results.sort(key=lambda s: (s.get("displayName") or "").lower())
    return results


# ---------------------------------------------------------------------------
# Resource groups
# ---------------------------------------------------------------------------

def list_resource_groups(subscription_id: str) -> List[Dict[str, Any]]:
    from azure.mgmt.resource import ResourceManagementClient

    client = ResourceManagementClient(_cred(), subscription_id)
    results = []
    for rg in client.resource_groups.list():
        results.append({
            "name": rg.name,
            "location": rg.location,
        })
    results.sort(key=lambda r: (r.get("name") or "").lower())
    return results


# ---------------------------------------------------------------------------
# SQL VMs
# ---------------------------------------------------------------------------

def list_sql_vms(subscription_id: str, resource_group: str) -> List[Dict[str, Any]]:
    from azure.mgmt.compute import ComputeManagementClient

    client = ComputeManagementClient(_cred(), subscription_id)
    results = []
    for vm in client.virtual_machines.list(resource_group):
        results.append({
            "name": vm.name,
            "location": vm.location,
            "id": vm.id,
        })
    results.sort(key=lambda v: (v.get("name") or "").lower())
    return results


# ---------------------------------------------------------------------------
# SQL Managed Instances
# ---------------------------------------------------------------------------

def list_sql_managed_instances(subscription_id: str, resource_group: str) -> List[Dict[str, Any]]:
    from azure.mgmt.sql import SqlManagementClient

    client = SqlManagementClient(_cred(), subscription_id)
    results = []
    for mi in client.managed_instances.list_by_resource_group(resource_group):
        results.append({
            "name": mi.name,
            "location": mi.location,
            "id": mi.id,
        })
    results.sort(key=lambda v: (v.get("name") or "").lower())
    return results


# ---------------------------------------------------------------------------
# Synapse workspaces + SQL pools
# ---------------------------------------------------------------------------

def list_synapse_workspaces(subscription_id: str, resource_group: str) -> List[Dict[str, Any]]:
    from azure.mgmt.synapse import SynapseManagementClient

    client = SynapseManagementClient(_cred(), subscription_id)
    results = []
    for ws in client.workspaces.list_by_resource_group(resource_group):
        results.append({
            "name": ws.name,
            "location": ws.location,
            "id": ws.id,
        })
    results.sort(key=lambda v: (v.get("name") or "").lower())
    return results


def list_synapse_sql_pools(subscription_id: str, resource_group: str, workspace_name: str) -> List[Dict[str, Any]]:
    from azure.mgmt.synapse import SynapseManagementClient

    client = SynapseManagementClient(_cred(), subscription_id)
    results = []
    for pool in client.sql_pools.list_by_workspace(resource_group, workspace_name):
        results.append({
            "name": pool.name,
            "location": pool.location,
            "status": pool.status,
            "id": pool.id,
        })
    results.sort(key=lambda v: (v.get("name") or "").lower())
    return results


# ---------------------------------------------------------------------------
# Service Bus namespaces + entities
# ---------------------------------------------------------------------------

def list_service_bus_namespaces(subscription_id: str, resource_group: str) -> List[Dict[str, Any]]:
    from azure.mgmt.servicebus import ServiceBusManagementClient  # type: ignore[import]

    client = ServiceBusManagementClient(_cred(), subscription_id)
    results = []
    for ns in client.namespaces.list_by_resource_group(resource_group):
        results.append({
            "name": ns.name,
            "location": ns.location,
            "id": ns.id,
            # strip the .servicebus.windows.net FQDN suffix for picker display
            "shortName": (ns.name or "").split(".")[0],
        })
    results.sort(key=lambda v: (v.get("name") or "").lower())
    return results


def list_service_bus_entities(
    subscription_id: str, resource_group: str, namespace_name: str
) -> List[Dict[str, Any]]:
    """Return queues and topics in the namespace, tagged with entityType."""
    from azure.mgmt.servicebus import ServiceBusManagementClient  # type: ignore[import]

    # namespace_name may arrive as an FQDN; use only the short name
    short_name = namespace_name.split(".")[0]

    client = ServiceBusManagementClient(_cred(), subscription_id)
    results = []
    for queue in client.queues.list_by_namespace(resource_group, short_name):
        results.append({"name": queue.name, "entityType": "queue"})
    for topic in client.topics.list_by_namespace(resource_group, short_name):
        results.append({"name": topic.name, "entityType": "topic"})
    results.sort(key=lambda v: (v.get("entityType", ""), (v.get("name") or "").lower()))
    return results


# ---------------------------------------------------------------------------
# App Service (Web Apps)
# ---------------------------------------------------------------------------
def list_web_apps(subscription_id: str, resource_group: str) -> List[Dict[str, Any]]:
    from azure.mgmt.web import WebSiteManagementClient

    client = WebSiteManagementClient(_cred(), subscription_id)
    results: List[Dict[str, Any]] = []
    for site in client.web_apps.list_by_resource_group(resource_group):
        results.append({
            "name": site.name,
            "location": getattr(site, "location", None),
            "id": getattr(site, "id", None),
        })
    results.sort(key=lambda v: (v.get("name") or "").lower())
    return results


# ---------------------------------------------------------------------------
# Container Instances (container groups)
# ---------------------------------------------------------------------------
def list_container_groups(subscription_id: str, resource_group: str) -> List[Dict[str, Any]]:
    from azure.mgmt.containerinstance import ContainerInstanceManagementClient

    client = ContainerInstanceManagementClient(_cred(), subscription_id)
    results: List[Dict[str, Any]] = []
    for group in client.container_groups.list_by_resource_group(resource_group):
        results.append({
            "name": group.name,
            "location": getattr(group, "location", None),
            "id": getattr(group, "id", None),
        })
    results.sort(key=lambda v: (v.get("name") or "").lower())
    return results


# ---------------------------------------------------------------------------
# Live status resolver — used by the EnvStatusWidget realtime check
# ---------------------------------------------------------------------------

# Map catalog type strings and ARM provider prefixes to resolver keys
_ARM_TYPE_TO_KIND: Dict[str, str] = {
    "microsoft.web/sites": "web",
    "app-service": "web",
    "function-app": "web",
    "web-app": "web",
    "microsoft.compute/virtualmachines": "vm",
    "virtual-machine": "vm",
    "sql-vm": "vm",
    "microsoft.sql/managedinstances": "sqlmi",
    "sql-managed-instance": "sqlmi",
    "microsoft.synapse/workspaces/sqlpools": "synapse-pool",
    "synapse-sql-pool": "synapse-pool",
    "microsoft.servicebus/namespaces": "servicebus",
    "service-bus": "servicebus",
    "service-bus-message": "servicebus",
    "microsoft.containerinstance/containergroups": "aci",
    "container-instance": "aci",
    "microsoft.containerservice/managedclusters": "aks",
    "aks": "aks",
    "microsoft.app/containerapps": "webapp",
    "container-app": "webapp",
}


def _resolve_kind(type_str: str) -> str:
    """Return a resolver key for a catalog or ARM type string."""
    if not type_str:
        return "generic"
    lower = type_str.lower()
    if lower in _ARM_TYPE_TO_KIND:
        return _ARM_TYPE_TO_KIND[lower]
    for prefix, kind in _ARM_TYPE_TO_KIND.items():
        if lower.startswith(prefix):
            return kind
    return "generic"


def get_resource_statuses(
    subscription_id: str,
    resource_group: str,
    services: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Return an updated copy of *services* with live 'status' values.

    Each input dict needs at minimum 'type' and 'name'. When the name equals the
    type (i.e. no specific resource was configured in the catalog), the function
    falls back to listing all resources of that type in the resource group and
    uses the first one found.
    """
    import copy
    cred = _cred()
    result = copy.deepcopy(services)
    _clients: Dict[str, Any] = {}

    def _web():
        if "web" not in _clients:
            from azure.mgmt.web import WebSiteManagementClient
            _clients["web"] = WebSiteManagementClient(cred, subscription_id)
        return _clients["web"]

    def _compute():
        if "compute" not in _clients:
            from azure.mgmt.compute import ComputeManagementClient
            _clients["compute"] = ComputeManagementClient(cred, subscription_id)
        return _clients["compute"]

    def _sqlmi():
        if "sqlmi" not in _clients:
            from azure.mgmt.sql import SqlManagementClient
            _clients["sqlmi"] = SqlManagementClient(cred, subscription_id)
        return _clients["sqlmi"]

    def _synapse():
        if "synapse" not in _clients:
            from azure.mgmt.synapse import SynapseManagementClient
            _clients["synapse"] = SynapseManagementClient(cred, subscription_id)
        return _clients["synapse"]

    def _servicebus():
        if "servicebus" not in _clients:
            from azure.mgmt.servicebus import ServiceBusManagementClient  # type: ignore[import]
            _clients["servicebus"] = ServiceBusManagementClient(cred, subscription_id)
        return _clients["servicebus"]

    def _aci():
        if "aci" not in _clients:
            from azure.mgmt.containerinstance import ContainerInstanceManagementClient
            _clients["aci"] = ContainerInstanceManagementClient(cred, subscription_id)
        return _clients["aci"]

    def _fetch_status(kind: str, name: str, extra: Dict[str, Any]) -> str:
        try:
            if kind == "web":
                site = _web().web_apps.get(resource_group, name)
                return site.state or "Unknown"
            if kind == "vm":
                iv = _compute().virtual_machines.instance_view(resource_group, name)
                for st in getattr(iv, "statuses", []) or []:
                    code = getattr(st, "code", "") or ""
                    if code.startswith("PowerState/"):
                        return code.split("/", 1)[1].capitalize()
                return "Unknown"
            if kind == "sqlmi":
                mi = _sqlmi().managed_instances.get(resource_group, name)
                return getattr(mi, "state", None) or "Unknown"
            if kind == "synapse-pool":
                ws_name = extra.get("workspaceName") or extra.get("namespace") or ""
                if ws_name:
                    pool = _synapse().sql_pools.get(resource_group, ws_name, name)
                    return getattr(pool, "status", None) or "Unknown"
            if kind == "servicebus":
                ns = _servicebus().namespaces.get(resource_group, name)
                return getattr(ns, "status", None) or "Unknown"
            if kind == "aci":
                group = _aci().container_groups.get(resource_group, name)
                return getattr(group, "provisioning_state", None) or "Unknown"
        except Exception as exc:
            _log.debug("type-specific status failed %s/%s (%s): %s", resource_group, name, kind, exc)
        return "Unknown"

    def _list_first_by_kind(kind: str, svc: Dict[str, Any]) -> None:
        """When no specific name is known, list by type and use the first result."""
        try:
            if kind == "web":
                sites = list(_web().web_apps.list_by_resource_group(resource_group))
                if sites:
                    svc["status"] = sites[0].state or "Unknown"
                    svc["name"] = sites[0].name
                    svc["id"] = getattr(sites[0], "id", None) or svc.get("id")
                    svc["region"] = getattr(sites[0], "location", None) or svc.get("region")
        except Exception as exc:
            _log.debug("fallback list failed %s (%s): %s", resource_group, kind, exc)

    for svc in result:
        name = (svc.get("name") or "").strip()
        svc_type = (svc.get("type") or "").strip()
        kind = _resolve_kind(svc_type)

        # No specific resource name → list by type and pick first
        if not name or name.lower() == svc_type.lower():
            _list_first_by_kind(kind, svc)
            continue

        svc["status"] = _fetch_status(kind, name, svc)

    return result
