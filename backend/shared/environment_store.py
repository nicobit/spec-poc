from __future__ import annotations

from copy import deepcopy
from typing import Any, Dict, List, Optional


ENVIRONMENTS: List[Dict[str, Any]] = [
    {
        "seed": True,
        "id": "env-1",
        "name": "dev-1",
        "status": "stopped",
        "region": "eastus",
        "client": "Client 001",
        "clientId": "client-001",
        "stages": [
            {
                "id": "stage-dev-sql",
                "name": "stage1",
                "status": "stopped",
                "resourceActions": [
                    {
                        "id": "ra-1",
                        "type": "sql-vm",
                        "region": "eastus",
                        "resourceGroup": "rg-dev-eastus",
                        "subscriptionId": "sub-dev",
                        "properties": {
                            "vmName": "sqlvm-dev-01",
                        },
                    },
                    {
                        "id": "ra-2",
                        "type": "service-bus-message",
                        "region": "eastus",
                        "resourceGroup": "rg-dev-eastus",
                        "subscriptionId": "sub-dev",
                        "properties": {
                            "namespace": "sb-dev",
                            "entityType": "queue",
                            "entityName": "environment-events",
                            "messageTemplate": "environment.lifecycle",
                        },
                    },
                ],
                "notificationGroups": [
                    {"id": "ng-qa", "name": "QA Team", "recipients": ["qa.team@example.com"]},
                    {"id": "ng-devops", "name": "DevOps", "recipients": ["devops@example.com"]},
                ],
                "postponementPolicy": {
                    "enabled": True,
                    "maxPostponeMinutes": 120,
                    "maxPostponements": 2,
                },
            }
        ],
    },
    {
        "seed": True,
        "id": "env-2",
        "name": "qa-1",
        "status": "running",
        "region": "westeurope",
        "client": "Client 002",
        "clientId": "client-002",
        "stages": [
            {
                "id": "stage-qa-live",
                "name": "live",
                "status": "running",
                "resourceActions": [
                    {
                        "id": "ra-3",
                        "type": "synapse-sql-pool",
                        "region": "westeurope",
                        "resourceGroup": "rg-qa-we",
                        "subscriptionId": "sub-qa",
                        "properties": {
                            "workspaceName": "synapse-qa-we",
                            "sqlPoolName": "qa_dw",
                        },
                    },
                    {
                        "id": "ra-4",
                        "type": "sql-managed-instance",
                        "region": "westeurope",
                        "resourceGroup": "rg-qa-we",
                        "subscriptionId": "sub-qa",
                        "properties": {
                            "managedInstanceName": "sqlmi-qa-01",
                        },
                    },
                ],
                "notificationGroups": [
                    {"id": "ng-ops", "name": "Operations", "recipients": ["ops@example.com"]},
                ],
                "postponementPolicy": {
                    "enabled": True,
                    "maxPostponeMinutes": 60,
                    "maxPostponements": 1,
                },
            }
        ],
    },
]


def list_environments() -> List[Dict[str, Any]]:
    return deepcopy(ENVIRONMENTS)


def get_environment(env_id: str) -> Optional[Dict[str, Any]]:
    for environment in ENVIRONMENTS:
        if environment.get("id") == env_id:
            return deepcopy(environment)
    return None


def _find_environment_ref(env_id: str) -> Optional[Dict[str, Any]]:
    for environment in ENVIRONMENTS:
        if environment.get("id") == env_id:
            return environment
    return None


def get_stage(env_id: str, stage_id: str) -> Optional[Dict[str, Any]]:
    environment = get_environment(env_id)
    if not environment:
        return None
    for stage in environment.get("stages", []):
        if stage.get("id") == stage_id or stage.get("name") == stage_id:
            return stage
    return None


def update_stage_configuration(env_id: str, stage_id: str, configuration: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    environment = _find_environment_ref(env_id)
    if not environment:
        return None
    for stage in environment.get("stages", []):
        if stage.get("id") == stage_id or stage.get("name") == stage_id:
            stage["resourceActions"] = configuration.get("resourceActions", [])
            stage["notificationGroups"] = configuration.get("notificationGroups", [])
            stage["postponementPolicy"] = configuration.get("postponementPolicy", {})
            return deepcopy(stage)
    return None


def set_stage_status(env_id: str, stage_id: str, status: str) -> Optional[Dict[str, Any]]:
    environment = _find_environment_ref(env_id)
    if not environment:
        return None
    for stage in environment.get("stages", []):
        if stage.get("id") == stage_id or stage.get("name") == stage_id:
            stage["status"] = status
            environment["status"] = status
            return deepcopy(stage)
    return None


def get_default_stage(env_id: str) -> Optional[Dict[str, Any]]:
    environment = get_environment(env_id)
    if not environment:
        return None
    stages = environment.get("stages") or []
    return stages[0] if stages else None


def create_environment(data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new environment in the in-memory store and return the created item.

    Validate against the Pydantic model before persisting to catch schema issues early.
    """
    import uuid as _uuid
    from .environment_model import EnvironmentModel

    env = deepcopy(data)
    env_id = env.get("id") or f"env-{_uuid.uuid4().hex[:8]}"
    env["id"] = env_id
    # Ensure stages is a list even if caller passed None
    env["stages"] = env.get("stages") or []
    # Validate
    try:
        EnvironmentModel.model_validate(env)
    except Exception:
        # For in-memory dev/test convenience, still allow creation but propagate error
        raise

    ENVIRONMENTS.append(env)
    return deepcopy(env)


def update_environment(env: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update an existing environment in the in-memory store. Returns the updated item or None if not found."""
    if not env or not env.get("id"):
        return None
    ref = _find_environment_ref(env.get("id"))
    if not ref:
        return None
    # Validate
    from .environment_model import EnvironmentModel

    try:
        EnvironmentModel.model_validate(env)
    except Exception:
        raise

    # Replace fields from env into ref
    for k, v in env.items():
        ref[k] = deepcopy(v)
    return deepcopy(ref)


def delete_environment(env_id: str) -> bool:
    """Delete an environment from the in-memory store. Returns True if deleted."""
    global ENVIRONMENTS
    before = len(ENVIRONMENTS)
    ENVIRONMENTS = [e for e in ENVIRONMENTS if e.get("id") != env_id]
    return len(ENVIRONMENTS) < before
