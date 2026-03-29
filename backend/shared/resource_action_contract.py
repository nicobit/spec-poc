from __future__ import annotations

from typing import Any, Dict, List, Tuple


REQUIRED_RESOURCE_ACTION_PROPERTIES = {
    "sql-vm": ["vmName"],
    "sql-managed-instance": ["managedInstanceName"],
    "synapse-sql-pool": ["workspaceName", "sqlPoolName"],
    "service-bus-message": ["namespace", "entityType", "entityName", "messageTemplate"],
}


LEGACY_PROPERTY_ALIASES = {
    "sql-vm": {"vmName": ["serverName"]},
    "sql-managed-instance": {"managedInstanceName": ["instanceName"]},
    "service-bus-message": {
        "entityName": ["queueOrTopic"],
        "messageTemplate": ["messageType"],
    },
}


def normalize_resource_action(action: Dict[str, Any]) -> Dict[str, Any]:
    normalized = dict(action)
    properties = dict(normalized.get("properties") or {})
    action_type = normalized.get("type")
    aliases = LEGACY_PROPERTY_ALIASES.get(action_type, {})
    for canonical_name, legacy_keys in aliases.items():
        if properties.get(canonical_name):
            continue
        for legacy_key in legacy_keys:
            legacy_value = normalized.get(legacy_key)
            if legacy_value:
                properties[canonical_name] = legacy_value
                break
    normalized["properties"] = properties
    return normalized


def missing_required_properties(action: Dict[str, Any]) -> List[str]:
    normalized = normalize_resource_action(action)
    required = REQUIRED_RESOURCE_ACTION_PROPERTIES.get(normalized.get("type"), [])
    properties = normalized.get("properties") or {}
    missing = [name for name in required if not properties.get(name)]
    shared_required = ["subscriptionId", "resourceGroup", "region"]
    missing.extend([name for name in shared_required if not normalized.get(name)])
    return missing


def validate_resource_action(action: Dict[str, Any]) -> Tuple[bool, List[str]]:
    normalized = normalize_resource_action(action)
    if normalized.get("type") not in REQUIRED_RESOURCE_ACTION_PROPERTIES:
        return False, ["unsupported type"]
    missing = missing_required_properties(normalized)
    return len(missing) == 0, missing


def describe_resource_action(action: Dict[str, Any]) -> str:
    normalized = normalize_resource_action(action)
    properties = normalized.get("properties") or {}
    action_type = normalized.get("type")
    if action_type == "sql-vm":
        return properties.get("vmName") or normalized.get("id") or "sql-vm"
    if action_type == "sql-managed-instance":
        return properties.get("managedInstanceName") or normalized.get("id") or "sql-managed-instance"
    if action_type == "synapse-sql-pool":
        workspace = properties.get("workspaceName")
        pool = properties.get("sqlPoolName")
        return "/".join([value for value in (workspace, pool) if value]) or normalized.get("id") or "synapse-sql-pool"
    if action_type == "service-bus-message":
        namespace = properties.get("namespace")
        entity_type = properties.get("entityType")
        entity_name = properties.get("entityName")
        return "/".join([value for value in (namespace, entity_type, entity_name) if value]) or normalized.get("id") or "service-bus-message"
    return normalized.get("id") or str(action_type or "resource-action")

