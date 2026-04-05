from __future__ import annotations

from copy import deepcopy
from typing import Any, Dict, List, Optional


ENVIRONMENTS: List[Dict[str, Any]] = []


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
