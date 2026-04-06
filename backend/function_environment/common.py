import inspect
import logging
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, Request
from fastapi.encoders import jsonable_encoder
from pydantic import ValidationError

from shared.context import get_current_user
from shared.client_store import get_client as get_client_item
from shared.client_store import list_clients as list_client_items
from shared.client_store import resolve_client_reference
from shared.environment_repository import get_environment_store
from shared.environment_store import get_environment as get_environment_item
from shared.environment_store import list_environments as list_environment_items
from shared.execution_store import get_latest_stage_execution
from shared.execution_store import get_stage_execution as get_stage_execution_item
from shared.execution_store import get_stage_execution_store
from shared.execution_store import list_stage_executions_for_schedule
from shared.execution_store import list_stage_executions_for_stage
from shared.schedule_store import get_schedule_store


logger = logging.getLogger("function_environment")

schedule_store = get_schedule_store()
COSMOS_ENABLED = bool(os.environ.get("COSMOS_CONNECTION_STRING"))
stage_execution_store = get_stage_execution_store() if COSMOS_ENABLED else None
env_store = get_environment_store()


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _utc_now_iso() -> str:
    return _utc_now().isoformat()


def _validation_error_detail(exc: ValidationError):
    return jsonable_encoder(exc.errors(), custom_encoder={ValueError: str})


async def _resolve_user(req: Request):
    """Call `get_current_user(req)` and await if it returns an awaitable."""
    try:
        maybe = get_current_user(req)
    except TypeError:
        return get_current_user
    if inspect.isawaitable(maybe):
        return await maybe
    return maybe


def _reset_stale_transient_stage_statuses():
    """Reset stages stuck in transient states from a previous process run."""
    transient_statuses = {"starting", "stopping", "in_progress"}
    try:
        all_envs = env_store.list_environments() if env_store else list_environment_items()
        for env in all_envs:
            changed = False
            for stage in env.get("stages") or []:
                if stage.get("status") in transient_statuses:
                    logger.warning(
                        "Startup: resetting stale stage status '%s' -> 'unknown' (env=%s stage=%s)",
                        stage["status"],
                        env.get("id"),
                        stage.get("id"),
                    )
                    stage["status"] = "unknown"
                    changed = True
            if changed:
                try:
                    if env_store:
                        env_store.update_environment(env)
                    else:
                        from shared.environment_store import update_environment as _update_environment

                        _update_environment(env)
                except Exception:
                    logger.exception(
                        "Startup: failed to persist stale-state reset for env %s",
                        env.get("id"),
                    )
    except Exception:
        logger.exception("Startup: stale transient stage status reset failed")


_reset_stale_transient_stage_statuses()


def _list_environment_refs() -> list[dict]:
    try:
        return env_store.list_environments() if env_store else list_environment_items()
    except Exception:
        return list_environment_items()


def _list_client_refs(*, include_retired: bool = False) -> list[dict]:
    try:
        return list_client_items(include_retired=include_retired)
    except Exception:
        return list_client_items(include_retired=include_retired)


def _client_response_payload(item: dict) -> dict:
    return {
        "id": item.get("id"),
        "name": item.get("name"),
        "shortCode": item.get("shortCode"),
        "country": item.get("country"),
        "timezone": item.get("timezone"),
        "clientAdmins": item.get("clientAdmins") or [],
        "retired": bool(item.get("retired")),
        "retiredAt": item.get("retiredAt"),
        "retiredBy": item.get("retiredBy"),
    }


def _decorate_environment_for_response(item: dict) -> dict:
    decorated = dict(item)
    client_id = decorated.get("clientId")
    if client_id:
        resolved_client = get_client_item(client_id)
        if resolved_client:
            decorated["client"] = resolved_client.get("name")
    return decorated


def _resolve_client_link(
    item: dict,
    *,
    existing: Optional[dict] = None,
) -> tuple[Optional[str], Optional[str], Optional[dict]]:
    client_id = item.get("client_id") or item.get("clientId")
    client_label = item.get("client")
    resolved_client = None

    if client_id:
        resolved_client = get_client_item(client_id)
        if not resolved_client:
            raise HTTPException(status_code=400, detail="client_id not found")
        client_label = resolved_client.get("name")
    elif client_label:
        try:
            resolved_client = resolve_client_reference(
                client_label,
                include_retired=False,
                allow_name=True,
                allow_short_code=True,
            )
        except ValueError as exc:
            detail = str(exc)
            if "ambiguous" in detail.lower():
                raise HTTPException(status_code=400, detail=detail) from exc
            raise HTTPException(status_code=400, detail="client not found") from exc
        client_id = resolved_client.get("id")
        client_label = resolved_client.get("name")
    elif existing:
        client_id = existing.get("clientId") or existing.get("client_id")
        client_label = existing.get("client")
        resolved_client = get_client_item(client_id) if client_id else None

    return client_id, client_label, resolved_client


def _canonicalize_environment_record(item: dict, *, existing: Optional[dict] = None) -> dict:
    canonical = dict(item)
    client_id, client_label, _ = _resolve_client_link(canonical, existing=existing)
    canonical["clientId"] = client_id
    canonical["client"] = client_label
    return canonical


def _resolve_environment_reference(
    item: dict,
    environments: list[dict],
    *,
    allow_missing_label: bool,
    existing: Optional[dict] = None,
):
    env_id = item.get("environment_id") or item.get("environmentId")
    resolved_env = None

    if env_id:
        resolved_env = next((env for env in environments if env.get("id") == env_id), None)
        if not resolved_env:
            raise HTTPException(status_code=400, detail="environment_id not found")
    elif item.get("environment"):
        label = str(item.get("environment") or "").lower()
        matches = [
            env
            for env in environments
            if str(env.get("id") or "").lower() == label
            or str(env.get("name") or "").lower() == label
            or (env.get("lifecycle") and str(env.get("lifecycle")).lower() == label)
        ]
        if len(matches) == 1:
            resolved_env = matches[0]
            env_id = resolved_env.get("id")
        elif len(matches) == 0:
            if allow_missing_label:
                resolved_env = None
                env_id = None
            else:
                raise HTTPException(status_code=400, detail="environment not found")
        else:
            raise HTTPException(
                status_code=400,
                detail="environment label is ambiguous; provide environment_id",
            )
    elif existing:
        env_id = existing.get("environment_id") or existing.get("environment")
        resolved_env = (
            next((env for env in environments if env.get("id") == env_id), None)
            if env_id
            else None
        )
    else:
        raise HTTPException(
            status_code=400,
            detail="environment_id or environment label is required",
        )

    return env_id, resolved_env


def _resolve_stage_reference(
    item: dict,
    resolved_env: Optional[dict],
    *,
    existing: Optional[dict] = None,
):
    stage_id = item.get("stage_id") or item.get("stageId")
    stage_label = item.get("stage")
    resolved_stage = None

    if resolved_env:
        stages = resolved_env.get("stages") or []
        if stage_id:
            resolved_stage = next((stage for stage in stages if stage.get("id") == stage_id), None)
            if not resolved_stage:
                raise HTTPException(status_code=400, detail="stage_id not found for environment")
            stage_label = resolved_stage.get("name")
        elif stage_label:
            label = str(stage_label or "").lower()
            matches = [
                stage
                for stage in stages
                if str(stage.get("id") or "").lower() == label
                or str(stage.get("name") or "").lower() == label
            ]
            if len(matches) == 1:
                resolved_stage = matches[0]
                stage_id = resolved_stage.get("id")
                stage_label = resolved_stage.get("name")
            elif len(matches) == 0:
                raise HTTPException(status_code=400, detail="stage not found for environment")
            else:
                raise HTTPException(
                    status_code=400,
                    detail="stage label is ambiguous; provide stage_id",
                )
        elif existing:
            stage_id = existing.get("stage_id") or existing.get("stageId")
            if stage_id:
                resolved_stage = next((stage for stage in stages if stage.get("id") == stage_id), None)
                if not resolved_stage:
                    raise HTTPException(status_code=400, detail="stage_id not found for environment")
                stage_label = resolved_stage.get("name")
            else:
                stage_label = existing.get("stage")
    else:
        if not stage_id and not stage_label and existing:
            stage_id = existing.get("stage_id") or existing.get("stageId")
            stage_label = existing.get("stage")

    return stage_id, stage_label, resolved_stage


def _canonicalize_schedule_record(
    item: dict,
    *,
    environments: Optional[list[dict]] = None,
    existing: Optional[dict] = None,
    allow_missing_environment_label: bool = False,
) -> dict:
    canonical = dict(item)
    envs = environments or _list_environment_refs()
    env_id, resolved_env = _resolve_environment_reference(
        canonical,
        envs,
        allow_missing_label=allow_missing_environment_label,
        existing=existing,
    )
    stage_id, stage_label, _ = _resolve_stage_reference(
        canonical,
        resolved_env,
        existing=existing,
    )
    client_id, client_label, _ = _resolve_client_link(
        canonical,
        existing=existing,
    )

    if resolved_env:
        env_client_id = resolved_env.get("clientId")
        env_client_label = resolved_env.get("client")
        if client_id and env_client_id and str(client_id) != str(env_client_id):
            raise HTTPException(
                status_code=400,
                detail="client_id does not match environment client",
            )
        client_id = env_client_id or client_id
        client_label = env_client_label or client_label

    canonical["environment_id"] = env_id
    canonical["environment"] = (
        resolved_env.get("name") if resolved_env else canonical.get("environment")
    )
    canonical["stage_id"] = stage_id
    canonical["stage"] = stage_label
    canonical["client_id"] = client_id
    canonical["client"] = client_label
    return canonical


def _decorate_schedule_for_response(
    item: dict,
    environments: Optional[list[dict]] = None,
) -> dict:
    decorated = dict(item)
    envs = environments or _list_environment_refs()
    resolved_env = None
    env_id = decorated.get("environment_id")
    if env_id:
        resolved_env = next((env for env in envs if env.get("id") == env_id), None)
    elif decorated.get("environment"):
        matches = [
            env
            for env in envs
            if str(env.get("name") or "").lower()
            == str(decorated.get("environment") or "").lower()
        ]
        if len(matches) == 1:
            resolved_env = matches[0]
            decorated["environment_id"] = resolved_env.get("id")
    if resolved_env:
        decorated["environment"] = resolved_env.get("name")
        decorated["client"] = resolved_env.get("client")
        decorated["client_id"] = resolved_env.get("clientId")
        stage_id = decorated.get("stage_id")
        if stage_id:
            stage = next(
                (item for item in resolved_env.get("stages", []) if item.get("id") == stage_id),
                None,
            )
            if stage:
                decorated["stage"] = stage.get("name")
    return decorated


def _execution_response_payload(item: dict) -> dict:
    return dict(item)


def _list_stage_execution_refs(stage_id: str, *, limit: int = 20) -> list[dict]:
    if stage_execution_store:
        try:
            return stage_execution_store.list_stage_executions_for_stage(stage_id, limit=limit)
        except Exception:
            logger.exception(
                "Failed to read stage executions from Cosmos; falling back to in-memory store"
            )
    return list_stage_executions_for_stage(stage_id, limit=limit)


def _list_schedule_execution_refs(schedule_id: str, *, limit: int = 20) -> list[dict]:
    if stage_execution_store:
        try:
            return stage_execution_store.list_stage_executions_for_schedule(schedule_id, limit=limit)
        except Exception:
            logger.exception(
                "Failed to read schedule executions from Cosmos; falling back to in-memory store"
            )
    return list_stage_executions_for_schedule(schedule_id, limit=limit)


def _get_latest_stage_execution_ref(stage_id: str) -> Optional[dict]:
    if stage_execution_store:
        try:
            return stage_execution_store.get_latest_stage_execution(stage_id)
        except Exception:
            logger.exception(
                "Failed to read latest stage execution from Cosmos; falling back to in-memory store"
            )
    return get_latest_stage_execution(stage_id)


def _get_stage_execution_ref(execution_id: str) -> Optional[dict]:
    if stage_execution_store:
        try:
            return stage_execution_store.get_stage_execution(execution_id)
        except Exception:
            logger.exception(
                "Failed to read stage execution from Cosmos; falling back to in-memory store"
            )
    return get_stage_execution_item(execution_id)


def _augment_schedule_with_execution_refs(schedule: dict) -> dict:
    decorated = dict(schedule)
    schedule_id = decorated.get("id")
    if not schedule_id:
        decorated["latestExecution"] = None
        return decorated
    executions = _list_schedule_execution_refs(schedule_id, limit=5)
    executions.sort(key=lambda item: item.get("requestedAt") or "", reverse=True)
    decorated["latestExecution"] = _execution_response_payload(executions[0]) if executions else None
    decorated["executions"] = [_execution_response_payload(item) for item in executions]
    return decorated


def _augment_stage_with_execution_refs(stage: dict) -> dict:
    decorated = dict(stage)
    stage_id = decorated.get("id")
    if not stage_id:
        decorated["latestExecution"] = None
        decorated["executions"] = []
        return decorated
    latest_execution = _get_latest_stage_execution_ref(stage_id)
    executions = _list_stage_execution_refs(stage_id, limit=10)
    executions.sort(key=lambda item: item.get("requestedAt") or "", reverse=True)
    decorated["latestExecution"] = (
        _execution_response_payload(latest_execution) if latest_execution else None
    )
    decorated["executions"] = [_execution_response_payload(item) for item in executions]
    return decorated


def _derive_type_from_stages(details: dict) -> Optional[str]:
    try:
        types = set()
        for stage in details.get("stages", []) or []:
            for resource_action in stage.get("resourceActions", []) or []:
                resource_type = resource_action.get("type") if isinstance(resource_action, dict) else None
                if resource_type:
                    types.add(str(resource_type))
        if not types:
            return None
        if len(types) == 1:
            return next(iter(types))
        prefixes = {resource_type.split("-", 1)[0] for resource_type in types}
        if len(prefixes) == 1:
            return prefixes.pop()
        return "mixed"
    except Exception:
        return None
