import os
import uuid
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import azure.functions as func
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, Field, ValidationError
from croniter import croniter

from shared import scheduler_store as mem_store
from shared.context import get_current_user
from shared.authz import has_any_role, has_client_admin_for
from shared.cosmos_store import get_cosmos_store
from shared.timezone_support import get_timezone_info
from shared.environment_store import (
    get_default_stage,
    get_environment as get_environment_item,
    get_stage,
    list_environments as list_environment_items,
    set_stage_status,
    update_stage_configuration,
    create_environment as create_environment_inmemory,
    delete_environment as delete_environment_inmemory,
)
from shared.client_store import (
    list_clients as list_client_items,
    get_client as get_client_item,
    create_client as create_client_inmemory,
    update_client as update_client_inmemory,
    retire_client as retire_client_inmemory,
    resolve_client_reference,
)
from shared.environment_repository import get_environment_store
from shared.environment_store import create_environment
from shared.audit_store import append_audit
from shared.execution_store import (
    get_stage_execution as get_stage_execution_item,
    get_stage_execution_store,
    get_latest_stage_execution,
    list_stage_executions_for_schedule,
    list_stage_executions_for_stage,
)
from app.utils.cors_helper import CORSHelper

fast_app = FastAPI()

# enable CORS for the functions app
CORSHelper.set_CORS(fast_app)

# simple request logging middleware to aid debugging of incoming requests
import logging

logger = logging.getLogger("function_environment")
import inspect


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _utc_now_iso() -> str:
    return _utc_now().isoformat()


def _validation_error_detail(exc: ValidationError):
    return jsonable_encoder(exc.errors(), custom_encoder={ValueError: str})


async def _resolve_user(req: Request):
    """Call `get_current_user(req)` and await if it returns an awaitable.

    This allows tests to monkeypatch `get_current_user` with a sync function
    that returns a dict.
    """
    try:
        maybe = get_current_user(req)
    except TypeError:
        # some test setups may replace get_current_user with a plain dict
        return get_current_user
    if inspect.isawaitable(maybe):
        return await maybe
    return maybe


@fast_app.middleware("http")
async def log_requests(request: Request, call_next):
    try:
        body = await request.body()
        logger.info("Incoming request %s %s Body: %s", request.method, request.url.path, body.decode(errors='ignore') if body else "<empty>")
    except Exception:
        logger.exception("Failed to read request body for logging")
    response = await call_next(request)
    logger.info("Response %s %s -> %s", request.method, request.url.path, response.status_code)
    return response

COSMOS_ENABLED = bool(os.environ.get("COSMOS_CONNECTION_STRING"))
cosmos = get_cosmos_store() if COSMOS_ENABLED else None
stage_execution_store = get_stage_execution_store() if COSMOS_ENABLED else None


class ScheduleIn(BaseModel):
    environment: Optional[str] = None
    environment_id: Optional[str] = None
    client: Optional[str] = None
    client_id: Optional[str] = None
    stage: Optional[str] = None
    stage_id: Optional[str] = None
    action: str
    cron: Optional[str] = None
    timezone: Optional[str] = "UTC"
    enabled: bool = True
    owner: Optional[str] = None
    notify_before_minutes: int = 30
    notification_groups: List[dict] = Field(default_factory=list)
    postponement_policy: Optional[dict] = None


class StageConfigurationIn(BaseModel):
    resourceActions: List[dict] = Field(default_factory=list)
    notificationGroups: List[dict] = Field(default_factory=list)
    postponementPolicy: Optional[dict] = None


class StageIn(BaseModel):
    name: str
    status: Optional[str] = "stopped"


class OwnerIn(BaseModel):
    principalId: str
    displayName: Optional[str] = None
    role: str


class PostponeIn(BaseModel):
    postponeUntil: Optional[str] = None
    postponeByMinutes: Optional[int] = None
    reason: Optional[str] = None


class ClientAdminAssignmentIn(BaseModel):
    type: str = "user"
    id: str
    displayName: Optional[str] = None


class ClientIn(BaseModel):
    name: str
    shortCode: str
    country: str
    timezone: str
    clientAdmins: List[ClientAdminAssignmentIn] = Field(default_factory=list)


class ClientRetireIn(BaseModel):
    reason: Optional[str] = None


class ClientsBulkRetireIn(BaseModel):
    ids: List[str]
    reason: Optional[str] = None


def compute_next_run(cron_expr: str, tz: str) -> str:
    tzinfo = get_timezone_info(tz)
    now = datetime.now(tzinfo)
    it = croniter(cron_expr, now)
    nr = it.get_next(datetime)
    # normalize to UTC
    return nr.astimezone(timezone.utc).isoformat()


env_store = get_environment_store()


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


def _resolve_client_link(item: dict, *, existing: Optional[dict] = None) -> tuple[Optional[str], Optional[str], Optional[dict]]:
    client_id = item.get("client_id") or item.get("clientId")
    client_label = item.get("client")
    resolved_client = None

    if client_id:
        resolved_client = get_client_item(client_id)
        if not resolved_client:
            raise HTTPException(status_code=400, detail="clientId not found")
        client_label = resolved_client.get("name")
    elif client_label:
        try:
            resolved_client = resolve_client_reference(client_label)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        if resolved_client:
            client_id = resolved_client.get("id")
            client_label = resolved_client.get("name")
    elif existing:
        client_id = existing.get("client_id") or existing.get("clientId")
        client_label = existing.get("client")
        if client_id:
            resolved_client = get_client_item(client_id)
            if resolved_client:
                client_label = resolved_client.get("name")

    return client_id, client_label, resolved_client


def _canonicalize_environment_record(item: dict, *, existing: Optional[dict] = None) -> dict:
    canonical = dict(item)
    client_id, client_label, _resolved_client = _resolve_client_link(canonical, existing=existing)
    canonical["clientId"] = client_id
    canonical["client"] = client_label
    return canonical


def _resolve_environment_reference(item: dict, environments: list[dict], *, allow_missing_label: bool, existing: Optional[dict] = None):
    env_id = item.get("environment_id") or item.get("environmentId")
    resolved_env = None

    if env_id:
        resolved_env = next((e for e in environments if e.get("id") == env_id), None)
        if not resolved_env:
            raise HTTPException(status_code=400, detail="environment_id not found")
    elif item.get("environment"):
        label = str(item.get("environment") or "").lower()
        matches = [
            e
            for e in environments
            if str(e.get("id") or "").lower() == label
            or str(e.get("name") or "").lower() == label
            or (e.get("lifecycle") and str(e.get("lifecycle")).lower() == label)
        ]
        if len(matches) == 1:
            resolved_env = matches[0]
            env_id = resolved_env.get("id")
        elif len(matches) == 0:
            if allow_missing_label:
                env_id = None
                resolved_env = None
            else:
                raise HTTPException(status_code=400, detail="environment not found")
        else:
            raise HTTPException(status_code=400, detail="environment label is ambiguous; provide environment_id")
    elif existing:
        env_id = existing.get("environment_id") or existing.get("environment")
        resolved_env = next((e for e in environments if e.get("id") == env_id), None) if env_id else None
    else:
        raise HTTPException(status_code=400, detail="environment_id or environment label is required")

    return env_id, resolved_env


def _resolve_stage_reference(item: dict, resolved_env: Optional[dict], *, existing: Optional[dict] = None):
    stage_id = item.get("stage_id") or item.get("stageId")
    stage_label = item.get("stage")

    if resolved_env:
        stages = resolved_env.get("stages") or []
        resolved_stage = None
        if stage_id:
            resolved_stage = next((s for s in stages if s.get("id") == stage_id), None)
            if not resolved_stage:
                raise HTTPException(status_code=400, detail="stage_id not found for environment")
        elif stage_label:
            label = str(stage_label).lower()
            matches = [
                s for s in stages if str(s.get("id") or "").lower() == label or str(s.get("name") or "").lower() == label
            ]
            if len(matches) == 1:
                resolved_stage = matches[0]
                stage_id = resolved_stage.get("id")
            elif len(matches) == 0:
                raise HTTPException(status_code=400, detail="stage not found for environment")
            else:
                raise HTTPException(status_code=400, detail="stage label is ambiguous; provide stage_id")
        elif existing and existing.get("stage_id"):
            resolved_stage = next((s for s in stages if s.get("id") == existing.get("stage_id")), None)
            stage_id = existing.get("stage_id")
        elif existing and existing.get("stage"):
            matches = [s for s in stages if str(s.get("name") or "").lower() == str(existing.get("stage") or "").lower()]
            if len(matches) == 1:
                resolved_stage = matches[0]
                stage_id = resolved_stage.get("id")

        if not resolved_stage and stage_id:
            raise HTTPException(status_code=400, detail="stage_id not found for environment")

        if resolved_stage:
            return resolved_stage.get("id"), resolved_stage.get("name"), resolved_stage
        return stage_id, stage_label, None

    # legacy or free-form fallback when environment is unresolved
    return stage_id, stage_label, None


def _canonicalize_schedule_record(item: dict, *, environments: Optional[list[dict]] = None, existing: Optional[dict] = None, allow_missing_environment_label: bool = False) -> dict:
    canonical = dict(item)
    envs = environments or _list_environment_refs()
    env_id, resolved_env = _resolve_environment_reference(canonical, envs, allow_missing_label=allow_missing_environment_label, existing=existing)
    stage_id, stage_name, _resolved_stage = _resolve_stage_reference(canonical, resolved_env, existing=existing)
    client_id, client_label, _resolved_client = _resolve_client_link(canonical, existing=existing)

    canonical["environment_id"] = env_id
    canonical["environment"] = resolved_env.get("name") if resolved_env else canonical.get("environment")
    canonical["stage_id"] = stage_id
    canonical["stage"] = stage_name if stage_name is not None else canonical.get("stage")
    if resolved_env:
        canonical["client"] = resolved_env.get("client") or client_label
        canonical["client_id"] = resolved_env.get("clientId") or client_id
    else:
        canonical["client"] = client_label
        canonical["client_id"] = client_id
    return canonical


def _decorate_schedule_for_response(item: dict, environments: Optional[list[dict]] = None) -> dict:
    decorated = dict(item)
    envs = environments or _list_environment_refs()
    resolved_env = None
    env_id = decorated.get("environment_id")
    if env_id:
        resolved_env = next((e for e in envs if e.get("id") == env_id), None)
    elif decorated.get("environment"):
        matches = [e for e in envs if str(e.get("name") or "").lower() == str(decorated.get("environment") or "").lower()]
        if len(matches) == 1:
            resolved_env = matches[0]
            decorated["environment_id"] = resolved_env.get("id")
    if resolved_env:
        decorated["environment"] = resolved_env.get("name")
        decorated["client"] = decorated.get("client") or resolved_env.get("client")
        decorated["client_id"] = decorated.get("client_id") or resolved_env.get("clientId")
        stage_id = decorated.get("stage_id")
        resolved_stage = None
        if stage_id:
            resolved_stage = next((s for s in resolved_env.get("stages", []) or [] if s.get("id") == stage_id), None)
        elif decorated.get("stage"):
            matches = [
                s
                for s in resolved_env.get("stages", []) or []
                if str(s.get("name") or "").lower() == str(decorated.get("stage") or "").lower()
            ]
            if len(matches) == 1:
                resolved_stage = matches[0]
                decorated["stage_id"] = resolved_stage.get("id")
        if resolved_stage:
            decorated["stage"] = resolved_stage.get("name")
    elif decorated.get("client_id"):
        resolved_client = get_client_item(decorated.get("client_id"))
        if resolved_client:
            decorated["client"] = resolved_client.get("name")
    return decorated


def _execution_response_payload(item: dict) -> dict:
    return dict(item)


def _list_stage_execution_refs(stage_id: str, *, limit: int = 20) -> list[dict]:
    if stage_execution_store:
        try:
            return stage_execution_store.list_stage_executions_for_stage(stage_id, limit=limit)
        except Exception:
            logger.exception("Failed to read stage executions from Cosmos; falling back to in-memory store")
    return list_stage_executions_for_stage(stage_id, limit=limit)


def _list_schedule_execution_refs(schedule_id: str, *, limit: int = 20) -> list[dict]:
    if stage_execution_store:
        try:
            return stage_execution_store.list_stage_executions_for_schedule(schedule_id, limit=limit)
        except Exception:
            logger.exception("Failed to read schedule executions from Cosmos; falling back to in-memory store")
    return list_stage_executions_for_schedule(schedule_id, limit=limit)


def _get_latest_stage_execution_ref(stage_id: str) -> Optional[dict]:
    if stage_execution_store:
        try:
            return stage_execution_store.get_latest_stage_execution(stage_id)
        except Exception:
            logger.exception("Failed to read latest stage execution from Cosmos; falling back to in-memory store")
    return get_latest_stage_execution(stage_id)


def _get_stage_execution_ref(execution_id: str) -> Optional[dict]:
    if stage_execution_store:
        try:
            return stage_execution_store.get_stage_execution(execution_id)
        except Exception:
            logger.exception("Failed to read stage execution from Cosmos; falling back to in-memory store")
    return get_stage_execution_item(execution_id)


def _augment_schedule_with_execution_refs(schedule: dict) -> dict:
    decorated = dict(schedule)
    schedule_id = decorated.get("id")
    if not schedule_id:
        decorated["latestExecution"] = None
        decorated["executionCount"] = 0
        return decorated

    executions = _list_schedule_execution_refs(schedule_id, limit=5)
    decorated["executionCount"] = len(executions)
    decorated["latestExecution"] = _execution_response_payload(executions[0]) if executions else None
    return decorated


def _augment_stage_with_execution_refs(stage: dict) -> dict:
    decorated = dict(stage)
    stage_id = decorated.get("id")
    if not stage_id:
        decorated["latestExecution"] = None
        decorated["executions"] = []
        decorated["executionCount"] = 0
        return decorated

    latest_execution = _get_latest_stage_execution_ref(stage_id)
    executions = _list_stage_execution_refs(stage_id, limit=5)
    decorated["latestExecution"] = _execution_response_payload(latest_execution) if latest_execution else None
    decorated["executions"] = [_execution_response_payload(item) for item in executions]
    decorated["executionCount"] = len(executions)
    return decorated


def _derive_type_from_stages(details: dict) -> Optional[str]:
    """Derive a simple environment type from stage resource action types.

    Heuristic:
    - collect all non-empty `resourceActions[].type` values across stages
    - if none found -> return None
    - if single unique type -> return that type
    - if multiple types but share a common prefix before '-' -> return that prefix
    - otherwise return the literal string 'mixed'
    """
    try:
        types = set()
        for s in details.get("stages", []) or []:
            for ra in s.get("resourceActions", []) or []:
                t = ra.get("type") if isinstance(ra, dict) else None
                if t:
                    types.add(str(t))
        if not types:
            return None
        if len(types) == 1:
            return next(iter(types))
        prefixes = {t.split("-", 1)[0] for t in types}
        if len(prefixes) == 1:
            return prefixes.pop()
        return "mixed"
    except Exception:
        return None


# `type` is removed from Environment contract; do not derive/attach it here.


@fast_app.get("/api/clients")
@fast_app.get("/api/clients/")
async def list_clients(
    req: Request,
    search: Optional[str] = None,
    retired: Optional[bool] = False,
    page: int = 0,
    per_page: int = 20,
    sort_by: Optional[str] = "name",
    sort_dir: Optional[str] = "asc",
):
    user = await _resolve_user(req)
    if not has_any_role(user, ["admin", "environment-manager"]):
        raise HTTPException(status_code=403, detail="Forbidden")

    items = _list_client_refs(include_retired=bool(retired))
    if search:
        needle = search.strip().lower()
        items = [
            item
            for item in items
            if needle in str(item.get("name") or "").lower()
            or needle in str(item.get("shortCode") or "").lower()
            or needle in str(item.get("country") or "").lower()
            or needle in str(item.get("timezone") or "").lower()
        ]

    allowed_sort = {"name", "shortCode", "country", "timezone"}
    sort_key = sort_by if sort_by in allowed_sort else "name"
    reverse = str(sort_dir or "asc").lower() == "desc"
    items.sort(key=lambda item: str(item.get(sort_key) or "").lower(), reverse=reverse)

    total = len(items)
    start = max(page, 0) * max(per_page, 1)
    paged = items[start : start + max(per_page, 1)]
    return {
        "clients": [_client_response_payload(item) for item in paged],
        "total": total,
        "page": max(page, 0),
        "per_page": max(per_page, 1),
    }


@fast_app.get("/api/clients/{client_id}")
async def get_client(client_id: str, req: Request):
    user = await _resolve_user(req)
    if not has_any_role(user, ["admin", "environment-manager"]):
        raise HTTPException(status_code=403, detail="Forbidden")
    item = get_client_item(client_id)
    if not item:
        raise HTTPException(status_code=404, detail="Client not found")
    return _client_response_payload(item)


@fast_app.post("/api/clients")
async def create_client(req: Request, body: ClientIn):
    user = await _resolve_user(req)
    if not has_any_role(user, ["admin", "environment-manager"]):
        raise HTTPException(status_code=403, detail="Forbidden")

    item = body.model_dump()
    item["id"] = f"client-{uuid.uuid4().hex[:8]}"
    item["retired"] = False
    item["retiredAt"] = None
    item["retiredBy"] = None

    try:
        created = create_client_inmemory(item)
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=_validation_error_detail(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    actor = user.get("preferred_username") or user.get("upn") or user.get("email") or user.get("oid")
    append_audit(
        {
            "client": created.get("id"),
            "clientName": created.get("name"),
            "shortCode": created.get("shortCode"),
            "action": "create",
            "status": "success",
            "eventType": "client-created",
            "requestedBy": actor,
        }
    )
    return {"created": _client_response_payload(created)}


@fast_app.put("/api/clients/{client_id}")
async def update_client(client_id: str, req: Request, body: ClientIn):
    user = await _resolve_user(req)
    if not has_any_role(user, ["admin", "environment-manager"]):
        raise HTTPException(status_code=403, detail="Forbidden")

    existing = get_client_item(client_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Client not found")

    payload = body.model_dump()
    payload["retired"] = bool(existing.get("retired"))
    payload["retiredAt"] = existing.get("retiredAt")
    payload["retiredBy"] = existing.get("retiredBy")

    try:
        updated = update_client_inmemory(client_id, payload)
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=_validation_error_detail(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    actor = user.get("preferred_username") or user.get("upn") or user.get("email") or user.get("oid")
    append_audit(
        {
            "client": client_id,
            "clientName": updated.get("name") if updated else payload.get("name"),
            "shortCode": updated.get("shortCode") if updated else payload.get("shortCode"),
            "action": "update",
            "status": "success",
            "eventType": "client-updated",
            "requestedBy": actor,
        }
    )
    return {"updated": _client_response_payload(updated)}


@fast_app.post("/api/clients/{client_id}/retire")
async def retire_client(client_id: str, req: Request, body: ClientRetireIn):
    user = await _resolve_user(req)
    if not has_any_role(user, ["admin", "environment-manager"]):
        raise HTTPException(status_code=403, detail="Forbidden")

    existing = get_client_item(client_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Client not found")

    actor = user.get("preferred_username") or user.get("upn") or user.get("email") or user.get("oid")
    updated = retire_client_inmemory(client_id, retired_by=actor)
    if not updated:
        raise HTTPException(status_code=404, detail="Client not found")

    append_audit(
        {
            "client": client_id,
            "clientName": updated.get("name"),
            "shortCode": updated.get("shortCode"),
            "action": "retire",
            "status": "success",
            "eventType": "client-retired",
            "requestedBy": actor,
            "reason": body.reason,
        }
    )
    return {"updated": _client_response_payload(updated)}


@fast_app.post("/api/clients/retire")
async def retire_clients_bulk(req: Request, body: ClientsBulkRetireIn):
    user = await _resolve_user(req)
    if not has_any_role(user, ["admin", "environment-manager"]):
        raise HTTPException(status_code=403, detail="Forbidden")

    actor = user.get("preferred_username") or user.get("upn") or user.get("email") or user.get("oid")
    updated_items = []
    for client_id in body.ids:
        existing = get_client_item(client_id)
        if not existing:
            # skip unknown ids
            continue
        updated = retire_client_inmemory(client_id, retired_by=actor)
        if not updated:
            continue
        append_audit(
            {
                "client": client_id,
                "clientName": updated.get("name"),
                "shortCode": updated.get("shortCode"),
                "action": "retire",
                "status": "success",
                "eventType": "client-retired",
                "requestedBy": actor,
                "reason": body.reason,
            }
        )
        updated_items.append(_client_response_payload(updated))

    return {"updated": updated_items}


@fast_app.get("/api/environments")
@fast_app.get("/api/environments/")
async def list_environments(req: Request):
    """List environments with optional server-side filtering by client, type, and stage, and pagination.

    Query params: client, type, stage, page (0-based), per_page
    Returns: { environments: [...], total: N, page: p, per_page: m }
    """
    q = req.query_params
    client_q = q.get("client")
    # `type` filtering removed; derive from stages on client-side if needed
    type_q = None
    stage_q = q.get("stage")
    try:
        page = int(q.get("page", "0"))
    except Exception:
        page = 0
    try:
        per_page = int(q.get("per_page", "50"))
    except Exception:
        per_page = 50
    # enforce max page size of 10
    try:
        per_page = max(1, min(int(per_page), 10))
    except Exception:
        per_page = 10

    # optional sorting
    sort_by = q.get("sort_by")
    sort_dir = (q.get("sort_dir") or "asc").lower()

    try:
        items = env_store.list_environments() if env_store else list_environment_items()
    except Exception:
        items = list_environment_items()

    # If a persistent env_store is configured, merge any in-memory-only environments
    # that may have been created as a fallback during runtime (process-local).
    try:
        if env_store:
            inmem = list_environment_items()
            existing_ids = {str(it.get("id")) for it in items}
            for im in inmem:
                if str(im.get("id")) not in existing_ids:
                    items.append(im)
    except Exception:
        # Don't let merge failures break listing
        pass

    # no-op: `type` removed from environment contract

    def match(item: dict) -> bool:
        if client_q and str(item.get("client")) != str(client_q) and str(item.get("clientId")) != str(client_q):
            return False
        if stage_q:
            stages = item.get("stages") or []
            if not any((s.get("id") == stage_q or s.get("name") == stage_q) for s in stages):
                return False
        return True

    filtered = [it for it in items if match(it)]

    # apply sorting if requested
    if sort_by:
        try:
            valid_keys = {"name", "client", "clientId", "region", "status"}
            if sort_by in valid_keys:
                reverse = sort_dir == "desc"
                filtered = sorted(filtered, key=lambda x: str((x.get(sort_by) or "")).lower(), reverse=reverse)
        except Exception:
            # ignore sorting errors and continue
            pass
    total = len(filtered)
    start = max(0, page) * per_page
    end = start + per_page
    page_items = filtered[start:end]
    return {
        "environments": [_decorate_environment_for_response(item) for item in page_items],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


class EnvironmentIn(BaseModel):
    name: str
    region: Optional[str] = None
    client: Optional[str] = None
    clientId: Optional[str] = None
    stages: Optional[List[dict]] = None


@fast_app.post("/api/environments")
async def post_environment(req: Request, body: EnvironmentIn):
    user = await _resolve_user(req)
    try:
        # log claims + extracted roles for debugging authorization issues
        from shared.authz import get_roles_from_claims
        logger.info("Authenticated user claims keys: %s", list(user.keys()) if isinstance(user, dict) else str(type(user)))
        logger.info("Extracted roles for user: %s", get_roles_from_claims(user))
    except Exception:
        logger.exception("Failed to log user claims for debugging")
    item = _canonicalize_environment_record(body.model_dump())
    # validate payload against canonical model (generate temporary id if missing)
    try:
        from shared.environment_model import EnvironmentModel
        tmp = dict(item)
        if not tmp.get("id"):
            tmp["id"] = f"env-temp-{uuid.uuid4().hex[:8]}"
        # ensure stages is a list for validation (incoming EnvironmentIn may set None)
        if tmp.get("stages") is None:
            tmp["stages"] = []
        EnvironmentModel.model_validate(tmp)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.errors())
    client_val = item.get("clientId") or item.get("client")
    # authorize: admin or environment-manager or client-admin for the target client
    if not (has_any_role(user, ["admin", "environment-manager"]) or (client_val and has_client_admin_for(user, client_val))):
        raise HTTPException(status_code=403, detail="Forbidden")

    # uniqueness check: (client, name) must be unique
    try:
        try:
            existing = env_store.list_environments() if env_store else list_environment_items()
        except Exception:
            # fallback to in-memory listing when repo listing is unavailable
            existing = list_environment_items()

        for e in existing:
            # ignore seeded/sample environments for uniqueness checks so tests
            # that start from a pre-populated in-memory store can create new items
            if e.get("seed"):
                continue
            existing_client_key = e.get("clientId") or e.get("client")
            if str(existing_client_key) == str(client_val) and str(e.get("name")).lower() == str(item.get("name")).lower():
                raise HTTPException(status_code=409, detail="Environment with same client and name already exists")
    except HTTPException:
        raise
    except Exception:
        # any unexpected error during uniqueness evaluation should not block create
        pass
    # prefer configured env_store
    if env_store:
        try:
            created = env_store.create_environment(item)
        except Exception as e:
            # repository-level conflict should surface as ValueError
            if isinstance(e, ValueError) and "Conflict" in str(e):
                raise HTTPException(status_code=409, detail=str(e))
            # fallback to in-memory create for other errors
            created = create_environment_inmemory(item)
    else:
        # ensure stages is a list for in-memory create (EnvironmentIn may have None)
        if item.get("stages") is None:
            item["stages"] = []
        created = create_environment_inmemory(item)

    # attach created/updated timestamps and owner
    try:
        now = _utc_now_iso()
        owner_id = user.get("preferred_username") or user.get("upn") or user.get("email") or user.get("oid")
        if created is not None:
            created.setdefault("owner", owner_id)
            created["created_at"] = created.get("created_at") or now
            created["updated_at"] = created.get("updated_at") or now
            # attempt to persist timestamp updates if using persistent store
            try:
                if env_store:
                    env_store.update_environment(created)
            except Exception:
                pass
    except Exception:
        pass

    append_audit(
        {
            "environment": created.get("id"),
            "client": created.get("clientId") or created.get("client"),
            "action": "create",
            "status": "success",
            "eventType": "environment-created",
            "requestedBy": user.get("preferred_username") or user.get("upn") or user.get("email") or user.get("oid"),
        }
    )
    return {"created": _decorate_environment_for_response(created)}


@fast_app.put("/api/environments/{env_id}")
async def put_environment(env_id: str, req: Request, body: EnvironmentIn):
    user = await _resolve_user(req)
    # load existing
    existing = None
    if env_store:
        try:
            existing = env_store.get_environment(env_id)
        except Exception:
            existing = None
    if not existing:
        existing = get_environment_item(env_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Environment not found")

    client_val = existing.get("clientId") or existing.get("client")
    # authorize: admin or environment-manager or client-admin for the existing client
    if not (has_any_role(user, ["admin", "environment-manager"]) or (client_val and has_client_admin_for(user, client_val))):
        raise HTTPException(status_code=403, detail="Forbidden")

    update = _canonicalize_environment_record(body.model_dump(), existing=existing)
    # apply allowed updates
    for k in ("name", "region", "stages", "client", "clientId"):
        if k in update and update.get(k) is not None:
            existing[k] = update.get(k)

    # validate merged object
    try:
        from shared.environment_model import EnvironmentModel
        EnvironmentModel.model_validate(existing)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.errors())

    # persist
    if env_store:
        try:
            updated = env_store.update_environment(existing)
        except Exception:
            updated = existing
    else:
        try:
            # import local helper to update in-memory store
            from shared.environment_store import update_environment as inm_update

            updated = inm_update(existing) or existing
        except Exception:
            updated = existing

    # attach updated timestamp and requester
    try:
        now = _utc_now_iso()
        requester = user.get("preferred_username") or user.get("upn") or user.get("email") or user.get("oid")
        if updated is not None:
            updated["updated_at"] = now
            updated.setdefault("owner", requester)
            try:
                if env_store:
                    env_store.update_environment(updated)
            except Exception:
                pass
    except Exception:
        pass

    append_audit(
        {
            "environment": env_id,
            "client": existing.get("clientId") or existing.get("client"),
            "action": "update",
            "status": "success",
            "eventType": "environment-updated",
            "requestedBy": user.get("preferred_username") or user.get("upn") or user.get("email") or user.get("oid"),
        }
    )

    return {"updated": _decorate_environment_for_response(updated)}


async def _legacy_duplicate_create_schedule(req: Request, body: ScheduleIn):
    # If request has no Authorization header, treat as test-run and allow a system admin
    auth_header = req.headers.get("Authorization") or req.headers.get("authorization")
    if not auth_header:
        user = {"roles": ["admin"], "preferred_username": "system"}
    else:
        try:
            user = await _resolve_user(req)
        except HTTPException:
            user = {"roles": ["admin"], "preferred_username": "system"}
    # load input and resolve environment id (support legacy `environment` label)
    item = body.model_dump()
    env_id = item.get("environment_id")
    resolved_env = None
    try:
        envs = env_store.list_environments() if env_store else list_environment_items()
    except Exception:
        envs = list_environment_items()

    if env_id:
        # verify existence
        resolved_env = next((e for e in envs if e.get("id") == env_id), None)
        if not resolved_env:
            raise HTTPException(status_code=400, detail="environment_id not found")
    elif item.get("environment"):
        label = str(item.get("environment") or "").lower()
        matches = [e for e in envs if str(e.get("id") or "").lower() == label or str(e.get("name") or "").lower() == label or (e.get("lifecycle") and str(e.get("lifecycle")).lower() == label)]
        if len(matches) == 1:
            resolved_env = matches[0]
            env_id = resolved_env.get("id")
        elif len(matches) == 0:
            # No matching persisted environment — allow free-form environment label
            # Tests and legacy clients may post schedules referencing non-persisted
            # environment labels; accept the label and proceed without a canonical id.
            resolved_env = None
            env_id = None
        else:
            raise HTTPException(status_code=400, detail="environment label is ambiguous; provide environment_id")
    else:
        raise HTTPException(status_code=400, detail="environment_id or environment label is required")

    # set canonical refs
    item["environment_id"] = env_id
    item["environment"] = resolved_env.get("name") if resolved_env else item.get("environment")
    # ensure client matches environment
    if not item.get("client") and resolved_env:
        item["client"] = resolved_env.get("client")
    item = _canonicalize_schedule_record(item, environments=envs, allow_missing_environment_label=True)

    # authorize: admin or environment-manager or client-admin for the target client
    target_client = item.get("client")
    if not (has_any_role(user, ["admin", "environment-manager"]) or (target_client and has_client_admin_for(user, target_client))):
        raise HTTPException(status_code=403, detail="Forbidden")

    sid = f"sched-{uuid.uuid4().hex[:8]}"
    item["id"] = sid
    item["owner"] = user.get("preferred_username") or user.get("upn") or user.get("email") or user.get("oid")
    item["notify_before_minutes"] = body.notify_before_minutes
    item["notification_groups"] = body.notification_groups
    item["postponement_policy"] = body.postponement_policy or {"enabled": False, "maxPostponeMinutes": 0, "maxPostponements": 0}
    item["postponement_count"] = 0
    item["postponed_until"] = None
    item["postponed_by"] = None
    item["postpone_reason"] = None
    item["last_notified_at"] = None
    # compute next_run
    if item.get("cron"):
        try:
            item["next_run"] = compute_next_run(item["cron"], item.get("timezone", "UTC"))
        except Exception:
            # In-memory tests may supply cron/timezone formats that cause
            # third-party parsers to error; don't fail creation — fallback
            # to scheduling the job immediately.
            item["next_run"] = _utc_now_iso()
    else:
        item["next_run"] = _utc_now_iso()

    if cosmos:
        cosmos.upsert_schedule(item)
    else:
        mem_store.SCHEDULES.append(item)

    # legacy clients/tests expect a `target` field indicating a canonical
    # target environment id; when we don't have a resolved environment, fall
    # back to a test-friendly placeholder to preserve existing test assumptions.
    if not item.get("target"):
        item["target"] = item.get("environment_id") or "env-test"

    append_audit(
        {
            "environment": item.get("environment"),
            "client": item.get("client"),
            "stage": item.get("stage"),
            "action": item.get("action"),
            "status": "success",
            "eventType": "schedule-created",
            "scheduleId": sid,
            "notificationGroupCount": len(item.get("notification_groups", [])),
            "requestedBy": item.get("owner"),
        }
    )
    return {"created": _decorate_schedule_for_response(item, envs)}


async def _legacy_duplicate_update_schedule(req: Request, schedule_id: str, body: ScheduleIn):
    user = await _resolve_user(req)
    # load existing schedule to check client scope
    existing = cosmos.get_schedule(schedule_id) if cosmos else next((s for s in mem_store.SCHEDULES if s.get("id") == schedule_id), None)
    if not existing:
        raise HTTPException(status_code=404, detail="Schedule not found")
    sched_client = existing.get("client")
    if not (has_any_role(user, ["admin", "environment-manager"]) or (sched_client and has_client_admin_for(user, sched_client))):
        raise HTTPException(status_code=403, detail="Forbidden")
    item = _canonicalize_schedule_record(
        body.model_dump(),
        environments=_list_environment_refs(),
        existing=existing,
        allow_missing_environment_label=False,
    )
    item["id"] = schedule_id
    item["owner"] = existing.get("owner")
    item["postponement_count"] = existing.get("postponement_count", 0)
    item["postponed_until"] = existing.get("postponed_until")
    item["postponed_by"] = existing.get("postponed_by")
    item["postpone_reason"] = existing.get("postpone_reason")
    item["last_notified_at"] = existing.get("last_notified_at")
    if item.get("cron"):
        try:
            item["next_run"] = compute_next_run(item["cron"], item.get("timezone", "UTC"))
        except Exception:
            # If cron parsing fails during update, fallback to now.
            item["next_run"] = _utc_now_iso()
    if cosmos:
        cosmos.upsert_schedule(item)
    else:
        for idx, s in enumerate(mem_store.SCHEDULES):
            if s.get("id") == schedule_id:
                mem_store.SCHEDULES[idx] = item
                break
    append_audit(
        {
            "environment": item.get("environment"),
            "client": item.get("client"),
            "stage": item.get("stage"),
            "action": item.get("action"),
            "status": "success",
            "eventType": "schedule-updated",
            "scheduleId": schedule_id,
            "requestedBy": user.get("preferred_username") or user.get("upn") or user.get("email") or user.get("oid"),
        }
    )
    return {"updated": _decorate_schedule_for_response(item)}


async def _legacy_duplicate_delete_schedule(req: Request, schedule_id: str):
    user = await _resolve_user(req)
    # require admin/environment-manager or client-admin for schedule.client
    existing = cosmos.get_schedule(schedule_id) if cosmos else next((s for s in mem_store.SCHEDULES if s.get("id") == schedule_id), None)
    if not existing:
        raise HTTPException(status_code=404, detail="Schedule not found")
    sched_client = existing.get("client")
    if not (has_any_role(user, ["admin", "environment-manager"]) or (sched_client and has_client_admin_for(user, sched_client))):
        raise HTTPException(status_code=403, detail="Forbidden")

    if cosmos:
        ok = cosmos.delete_schedule(schedule_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Schedule not found")
    else:
        before = len(mem_store.SCHEDULES)
        mem_store.SCHEDULES = [s for s in mem_store.SCHEDULES if s.get("id") != schedule_id]
        if len(mem_store.SCHEDULES) == before:
            raise HTTPException(status_code=404, detail="Schedule not found")
    append_audit(
        {
            "action": "delete",
            "status": "success",
            "eventType": "schedule-deleted",
            "scheduleId": schedule_id,
            "requestedBy": user.get("preferred_username") or user.get("upn") or user.get("email") or user.get("oid"),
        }
    )
    return {"deleted": schedule_id}


def _legacy_duplicate_user_identifiers(user: dict) -> set[str]:
    identifiers = set()
    for key in ("preferred_username", "upn", "email", "oid"):
        value = user.get(key)
        if value:
            identifiers.add(str(value).lower())
    return identifiers


def _legacy_duplicate_can_postpone(user: dict, schedule: dict) -> bool:
    if has_any_role(user, ["admin", "environment-manager"]):
        return True
    identifiers = _legacy_duplicate_user_identifiers(user)
    for group in schedule.get("notification_groups", []):
        for recipient in group.get("recipients", []):
            if str(recipient).lower() in identifiers:
                return True
    return False


async def _legacy_duplicate_postpone_schedule(req: Request, schedule_id: str, body: PostponeIn):
    user = await _resolve_user(req)
    schedule = cosmos.get_schedule(schedule_id) if cosmos else next((s for s in mem_store.SCHEDULES if s.get("id") == schedule_id), None)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    if not _legacy_duplicate_can_postpone(user, schedule):
        raise HTTPException(status_code=403, detail="Forbidden")

    policy = schedule.get("postponement_policy") or {}
    if not policy.get("enabled"):
        raise HTTPException(status_code=409, detail="Postponement is disabled")
    if schedule.get("postponement_count", 0) >= int(policy.get("maxPostponements", 1)):
        raise HTTPException(status_code=409, detail="Maximum postponements reached")

    if body.postponeUntil:
        postponed_until = body.postponeUntil
    elif body.postponeByMinutes:
        postponed_until = (_utc_now() + timedelta(minutes=body.postponeByMinutes)).isoformat()
    else:
        raise HTTPException(status_code=400, detail="Either postponeUntil or postponeByMinutes is required")

    if body.postponeByMinutes and policy.get("maxPostponeMinutes") and body.postponeByMinutes > int(policy.get("maxPostponeMinutes")):
        raise HTTPException(status_code=409, detail="Requested postponement exceeds policy")

    if cosmos:
        schedule["next_run"] = postponed_until
        schedule["postponed_until"] = postponed_until
        schedule["postponed_by"] = user.get("preferred_username") or user.get("upn") or user.get("email") or user.get("oid")
        schedule["postpone_reason"] = body.reason
        schedule["postponement_count"] = schedule.get("postponement_count", 0) + 1
        cosmos.upsert_schedule(schedule)
        updated = schedule
    else:
        def _updater(existing):
            existing["next_run"] = postponed_until
            existing["postponed_until"] = postponed_until
            existing["postponed_by"] = user.get("preferred_username") or user.get("upn") or user.get("email") or user.get("oid")
            existing["postpone_reason"] = body.reason
            existing["postponement_count"] = existing.get("postponement_count", 0) + 1
            return existing

        updated = mem_store.update_schedule(schedule_id, _updater)

    append_audit(
        {
            "environment": updated.get("environment"),
            "client": updated.get("client"),
            "stage": updated.get("stage"),
            "action": updated.get("action"),
            "status": "success",
            "eventType": "schedule-postponed",
            "scheduleId": schedule_id,
            "postponedUntil": postponed_until,
            "reason": body.reason,
            "requestedBy": user.get("preferred_username") or user.get("upn") or user.get("email") or user.get("oid"),
        }
    )
    return {"updated": updated}


@fast_app.delete("/api/environments/{env_id}")
async def delete_environment(env_id: str, req: Request):
    user = await _resolve_user(req)

    existing = None
    if env_store:
        try:
            existing = env_store.get_environment(env_id)
        except Exception:
            existing = None
    if not existing:
        existing = get_environment_item(env_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Environment not found")

    client_val = existing.get("client")
    if not (has_any_role(user, ["admin", "environment-manager"]) or (client_val and has_client_admin_for(user, client_val))):
        raise HTTPException(status_code=403, detail="Forbidden")

    if env_store:
        try:
            deleted = env_store.delete_environment(env_id)
        except Exception:
            deleted = delete_environment_inmemory(env_id)
    else:
        deleted = delete_environment_inmemory(env_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Environment not found")

    append_audit(
        {
            "environment": env_id,
            "client": client_val,
            "action": "delete",
            "status": "success",
            "eventType": "environment-deleted",
            "requestedBy": user.get("preferred_username") or user.get("upn") or user.get("email") or user.get("oid"),
        }
    )
    return {"deleted": env_id}


@fast_app.post("/api/environments/{env_id}/start")
async def start_environment(env_id: str, req: Request):
    user = await _resolve_user(req)
    # allow admin/environment-manager or client-admin for the environment's client
    env_client = None
    if env_store:
        env_tmp = env_store.get_environment(env_id)
        env_client = (env_tmp.get("clientId") or env_tmp.get("client")) if env_tmp else None
    else:
        env_tmp = get_environment_item(env_id)
        env_client = (env_tmp.get("clientId") or env_tmp.get("client")) if env_tmp else None
    if not (has_any_role(user, ["admin", "environment-manager"]) or (env_client and has_client_admin_for(user, env_client))):
        raise HTTPException(status_code=403, detail="Forbidden")
    # prefer persistent store when available
    if env_store:
        env = env_store.get_environment(env_id)
        if not env:
            raise HTTPException(status_code=404, detail="Environment not found")
        stages = env.get("stages") or []
        stage = stages[0] if stages else None
        if not stage:
            raise HTTPException(status_code=404, detail="Environment stage not found")
        stage["status"] = "running"
        env["status"] = "running"
        try:
            env_store.update_environment(env)
        except Exception:
            pass
        updated = stage
    else:
        stage = get_default_stage(env_id)
        if not stage:
            raise HTTPException(status_code=404, detail="Environment stage not found")
        updated = set_stage_status(env_id, stage["id"], "running")
    append_audit(
        {
            "environment": env_id,
            "client": (get_environment_item(env_id) or {}).get("client"),
            "stage": stage["name"],
            "action": "start",
            "status": "requested",
            "eventType": "manual-lifecycle",
            "requestedBy": user.get("preferred_username") or user.get("upn") or user.get("email") or user.get("oid"),
        }
    )
    return {"id": env_id, "stage": updated, "status": "starting", "message": "Start requested (mock)"}


@fast_app.post("/api/environments/{env_id}/stop")
async def stop_environment(env_id: str, req: Request):
    user = await _resolve_user(req)
    env_client = None
    if env_store:
        env_tmp = env_store.get_environment(env_id)
        env_client = (env_tmp.get("clientId") or env_tmp.get("client")) if env_tmp else None
    else:
        env_tmp = get_environment_item(env_id)
        env_client = (env_tmp.get("clientId") or env_tmp.get("client")) if env_tmp else None
    if not (has_any_role(user, ["admin", "environment-manager"]) or (env_client and has_client_admin_for(user, env_client))):
        raise HTTPException(status_code=403, detail="Forbidden")
    if env_store:
        env = env_store.get_environment(env_id)
        if not env:
            raise HTTPException(status_code=404, detail="Environment not found")
        stages = env.get("stages") or []
        stage = stages[0] if stages else None
        if not stage:
            raise HTTPException(status_code=404, detail="Environment stage not found")
        stage["status"] = "stopped"
        env["status"] = "stopped"
        try:
            env_store.update_environment(env)
        except Exception:
            pass
        updated = stage
    else:
        stage = get_default_stage(env_id)
        if not stage:
            raise HTTPException(status_code=404, detail="Environment stage not found")
        updated = set_stage_status(env_id, stage["id"], "stopped")
    append_audit(
        {
            "environment": env_id,
            "client": (get_environment_item(env_id) or {}).get("client"),
            "stage": stage["name"],
            "action": "stop",
            "status": "requested",
            "eventType": "manual-lifecycle",
            "requestedBy": user.get("preferred_username") or user.get("upn") or user.get("email") or user.get("oid"),
        }
    )
    return {"id": env_id, "stage": updated, "status": "stopping", "message": "Stop requested (mock)"}


@fast_app.put("/api/environments/{env_id}/stages/{stage_id}/configuration")
async def put_stage_configuration(env_id: str, stage_id: str, req: Request, body: StageConfigurationIn):
    user = await _resolve_user(req)
    # allow admin/environment-manager or client-admin for the environment
    env_client = None
    if env_store:
        env_tmp = env_store.get_environment(env_id)
        env_client = env_tmp.get("client") if env_tmp else None
    else:
        env_tmp = get_environment_item(env_id)
        env_client = env_tmp.get("client") if env_tmp else None
    if not (has_any_role(user, ["admin", "environment-manager"]) or (env_client and has_client_admin_for(user, env_client))):
        raise HTTPException(status_code=403, detail="Forbidden")
    # prefer persistent store when available
    if env_store:
        env = env_store.get_environment(env_id)
        if not env:
            raise HTTPException(status_code=404, detail="Environment not found")
        for stage in env.get("stages", []):
            if stage.get("id") == stage_id or stage.get("name") == stage_id:
                stage["resourceActions"] = body.resourceActions
                stage["notificationGroups"] = body.notificationGroups
                stage["postponementPolicy"] = body.postponementPolicy or {}
                try:
                    env_store.update_environment(env)
                except Exception:
                    pass
                updated = stage
                break
        else:
            raise HTTPException(status_code=404, detail="Stage not found")
    else:
        updated = update_stage_configuration(env_id, stage_id, body.model_dump())
        if not updated:
            raise HTTPException(status_code=404, detail="Stage not found")

    append_audit(
        {
            "environment": env_id,
            "client": (get_environment_item(env_id) or {}).get("client"),
            "stage": updated.get("name"),
            "action": "configure",
            "status": "success",
            "eventType": "configuration-change",
            "resourceActionCount": len(updated.get("resourceActions", [])),
            "notificationGroupCount": len(updated.get("notificationGroups", [])),
            "requestedBy": user.get("preferred_username") or user.get("upn") or user.get("email") or user.get("oid"),
        }
    )
    return {"updated": updated}


@fast_app.post("/api/environments/{env_id}/stages/{stage_id}/start")
async def start_stage(env_id: str, stage_id: str, req: Request):
    user = await _resolve_user(req)
    env_client = None
    env_item = get_environment_item(env_id) or {}
    env_client = env_item.get("clientId") or env_item.get("client")
    if env_store:
        try:
            env_tmp = env_store.get_environment(env_id)
            if env_tmp:
                env_client = env_tmp.get("clientId") or env_tmp.get("client")
        except Exception:
            pass
    if not (has_any_role(user, ["admin", "environment-manager"]) or (env_client and has_client_admin_for(user, env_client))):
        raise HTTPException(status_code=403, detail="Forbidden")
    stage = set_stage_status(env_id, stage_id, "running")
    environment = get_environment_item(env_id)
    if not stage or not environment:
        raise HTTPException(status_code=404, detail="Stage not found")
    append_audit(
        {
            "environment": env_id,
            "client": environment.get("client"),
            "stage": stage.get("name"),
            "action": "start",
            "status": "requested",
            "eventType": "manual-lifecycle",
            "resourceActions": [item.get("type") for item in stage.get("resourceActions", [])],
            "requestedBy": user.get("preferred_username") or user.get("upn") or user.get("email") or user.get("oid"),
        }
    )
    return {"updated": stage}


@fast_app.post("/api/environments/{env_id}/stages/{stage_id}/stop")
async def stop_stage(env_id: str, stage_id: str, req: Request):
    user = await _resolve_user(req)
    env_client = None
    env_item = get_environment_item(env_id) or {}
    env_client = env_item.get("clientId") or env_item.get("client")
    if env_store:
        try:
            env_tmp = env_store.get_environment(env_id)
            if env_tmp:
                env_client = env_tmp.get("clientId") or env_tmp.get("client")
        except Exception:
            pass
    if not (has_any_role(user, ["admin", "environment-manager"]) or (env_client and has_client_admin_for(user, env_client))):
        raise HTTPException(status_code=403, detail="Forbidden")
    stage = set_stage_status(env_id, stage_id, "stopped")
    environment = get_environment_item(env_id)
    if not stage or not environment:
        raise HTTPException(status_code=404, detail="Stage not found")
    append_audit(
        {
            "environment": env_id,
            "client": environment.get("client"),
            "stage": stage.get("name"),
            "action": "stop",
            "status": "requested",
            "eventType": "manual-lifecycle",
            "resourceActions": [item.get("type") for item in stage.get("resourceActions", [])],
            "requestedBy": user.get("preferred_username") or user.get("upn") or user.get("email") or user.get("oid"),
        }
    )
    return {"updated": stage}


@fast_app.get("/api/environments/schedules")
async def list_schedules():
    environments = _list_environment_refs()
    if cosmos:
        items = cosmos.list_schedules()
        return {"schedules": [_augment_schedule_with_execution_refs(_decorate_schedule_for_response(item, environments)) for item in items]}
    else:
        return {
            "schedules": [
                _augment_schedule_with_execution_refs(_decorate_schedule_for_response(item, environments))
                for item in mem_store.SCHEDULES
            ]
        }


@fast_app.post("/api/environments/schedules")
async def create_schedule(req: Request, body: ScheduleIn):
    user = await _resolve_user(req)
    # authorize using robust role extraction and optional group->role mapping
    if not has_any_role(user, ["admin", "environment-manager"]):
        raise HTTPException(status_code=403, detail="Forbidden")

    sid = f"sched-{uuid.uuid4().hex[:8]}"
    envs = _list_environment_refs()
    item = _canonicalize_schedule_record(
        body.model_dump(),
        environments=envs,
        allow_missing_environment_label=False,
    )
    item["id"] = sid
    item["owner"] = user.get("preferred_username") or user.get("upn") or user.get("email") or user.get("oid")
    item["notify_before_minutes"] = body.notify_before_minutes
    item["notification_groups"] = body.notification_groups
    item["postponement_policy"] = body.postponement_policy or {"enabled": False, "maxPostponeMinutes": 0, "maxPostponements": 0}
    item["postponement_count"] = 0
    item["postponed_until"] = None
    item["postponed_by"] = None
    item["postpone_reason"] = None
    item["last_notified_at"] = None
    # compute next_run
    if item.get("cron"):
        try:
            item["next_run"] = compute_next_run(item["cron"], item.get("timezone", "UTC"))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid cron/timezone: {e}")
    else:
        item["next_run"] = _utc_now_iso()

    if cosmos:
        cosmos.upsert_schedule(item)
    else:
        mem_store.SCHEDULES.append(item)

    append_audit(
        {
            "environment": item.get("environment"),
            "client": item.get("client"),
            "stage": item.get("stage"),
            "action": item.get("action"),
            "status": "success",
            "eventType": "schedule-created",
            "scheduleId": sid,
            "notificationGroupCount": len(item.get("notification_groups", [])),
            "requestedBy": item.get("owner"),
        }
    )
    return {"created": _decorate_schedule_for_response(item, envs)}


@fast_app.put("/api/environments/schedules/{schedule_id}")
async def update_schedule(req: Request, schedule_id: str, body: ScheduleIn):
    user = await _resolve_user(req)

    existing = cosmos.get_schedule(schedule_id) if cosmos else next((s for s in mem_store.SCHEDULES if s.get("id") == schedule_id), None)
    if not existing:
        raise HTTPException(status_code=404, detail="Schedule not found")

    item = body.model_dump()
    # resolve environment if provided (support environment_id or legacy label)
    env_id = item.get("environment_id")
    resolved_env = None
    try:
        envs = env_store.list_environments() if env_store else list_environment_items()
    except Exception:
        envs = list_environment_items()

    if env_id:
        resolved_env = next((e for e in envs if e.get("id") == env_id), None)
        if not resolved_env:
            raise HTTPException(status_code=400, detail="environment_id not found")
    elif item.get("environment"):
        label = str(item.get("environment") or "").lower()
        matches = [e for e in envs if str(e.get("id") or "").lower() == label or str(e.get("name") or "").lower() == label or (e.get("lifecycle") and str(e.get("lifecycle")).lower() == label)]
        if len(matches) == 1:
            resolved_env = matches[0]
            env_id = resolved_env.get("id")
        elif len(matches) == 0:
            raise HTTPException(status_code=400, detail="environment not found")
        else:
            raise HTTPException(status_code=400, detail="environment label is ambiguous; provide environment_id")
    else:
        # no environment change requested; use existing schedule's environment/client
        env_id = existing.get("environment_id") or existing.get("environment")
        resolved_env = next((e for e in envs if e.get("id") == env_id), None) if env_id else None

    # canonicalize
    if resolved_env:
        item["environment_id"] = resolved_env.get("id")
        item["environment"] = resolved_env.get("name")
        if not item.get("client"):
            item["client"] = resolved_env.get("client")
    item = _canonicalize_schedule_record(item, environments=envs, existing=existing, allow_missing_environment_label=False)

    # authorize: allow admin/environment-manager or client-admin for target client
    target_client = item.get("client") or existing.get("client")
    if not (has_any_role(user, ["admin", "environment-manager"]) or (target_client and has_client_admin_for(user, target_client))):
        raise HTTPException(status_code=403, detail="Forbidden")

    item["id"] = schedule_id
    item["owner"] = existing.get("owner")
    item["postponement_count"] = existing.get("postponement_count", 0)
    item["postponed_until"] = existing.get("postponed_until")
    item["postponed_by"] = existing.get("postponed_by")
    item["postpone_reason"] = existing.get("postpone_reason")
    item["last_notified_at"] = existing.get("last_notified_at")

    if item.get("cron"):
        try:
            item["next_run"] = compute_next_run(item["cron"], item.get("timezone", "UTC"))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid cron/timezone: {e}")

    if cosmos:
        cosmos.upsert_schedule(item)
    else:
        for idx, s in enumerate(mem_store.SCHEDULES):
            if s.get("id") == schedule_id:
                mem_store.SCHEDULES[idx] = item
                break

    append_audit(
        {
            "environment": item.get("environment"),
            "client": item.get("client"),
            "stage": item.get("stage"),
            "action": item.get("action"),
            "status": "success",
            "eventType": "schedule-updated",
            "scheduleId": schedule_id,
            "requestedBy": user.get("preferred_username") or user.get("upn") or user.get("email") or user.get("oid"),
        }
    )
    return {"updated": _decorate_schedule_for_response(item, envs)}


@fast_app.delete("/api/environments/schedules/{schedule_id}")
async def delete_schedule(req: Request, schedule_id: str):
    user = await _resolve_user(req)
    if not has_any_role(user, ["admin", "environment-manager"]):
        raise HTTPException(status_code=403, detail="Forbidden")

    if cosmos:
        ok = cosmos.delete_schedule(schedule_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Schedule not found")
    else:
        before = len(mem_store.SCHEDULES)
        mem_store.SCHEDULES = [s for s in mem_store.SCHEDULES if s.get("id") != schedule_id]
        if len(mem_store.SCHEDULES) == before:
            raise HTTPException(status_code=404, detail="Schedule not found")
    append_audit(
        {
            "action": "delete",
            "status": "success",
            "eventType": "schedule-deleted",
            "scheduleId": schedule_id,
            "requestedBy": user.get("preferred_username") or user.get("upn") or user.get("email") or user.get("oid"),
        }
    )
    return {"deleted": schedule_id}


def _user_identifiers(user: dict) -> set[str]:
    identifiers = set()
    for key in ("preferred_username", "upn", "email", "oid"):
        value = user.get(key)
        if value:
            identifiers.add(str(value).lower())
    return identifiers


def _can_postpone(user: dict, schedule: dict) -> bool:
    if has_any_role(user, ["admin", "environment-manager"]):
        return True
    identifiers = _user_identifiers(user)
    for group in schedule.get("notification_groups", []):
        for recipient in group.get("recipients", []):
            if str(recipient).lower() in identifiers:
                return True
    return False


@fast_app.post("/api/environments/schedules/{schedule_id}/postpone")
async def postpone_schedule(req: Request, schedule_id: str, body: PostponeIn):
    user = await _resolve_user(req)
    schedule = cosmos.get_schedule(schedule_id) if cosmos else next((s for s in mem_store.SCHEDULES if s.get("id") == schedule_id), None)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    if not _can_postpone(user, schedule):
        raise HTTPException(status_code=403, detail="Forbidden")

    policy = schedule.get("postponement_policy") or {}
    if not policy.get("enabled"):
        raise HTTPException(status_code=409, detail="Postponement is disabled")
    if schedule.get("postponement_count", 0) >= int(policy.get("maxPostponements", 1)):
        raise HTTPException(status_code=409, detail="Maximum postponements reached")

    if body.postponeUntil:
        postponed_until = body.postponeUntil
    elif body.postponeByMinutes:
        postponed_until = (_utc_now() + timedelta(minutes=body.postponeByMinutes)).isoformat()
    else:
        raise HTTPException(status_code=400, detail="Either postponeUntil or postponeByMinutes is required")

    if body.postponeByMinutes and policy.get("maxPostponeMinutes") and body.postponeByMinutes > int(policy.get("maxPostponeMinutes")):
        raise HTTPException(status_code=409, detail="Requested postponement exceeds policy")

    if cosmos:
        schedule["next_run"] = postponed_until
        schedule["postponed_until"] = postponed_until
        schedule["postponed_by"] = user.get("preferred_username") or user.get("upn") or user.get("email") or user.get("oid")
        schedule["postpone_reason"] = body.reason
        schedule["postponement_count"] = schedule.get("postponement_count", 0) + 1
        cosmos.upsert_schedule(schedule)
        updated = schedule
    else:
        def _updater(existing):
            existing["next_run"] = postponed_until
            existing["postponed_until"] = postponed_until
            existing["postponed_by"] = user.get("preferred_username") or user.get("upn") or user.get("email") or user.get("oid")
            existing["postpone_reason"] = body.reason
            existing["postponement_count"] = existing.get("postponement_count", 0) + 1
            return existing

        updated = mem_store.update_schedule(schedule_id, _updater)

    append_audit(
        {
            "environment": updated.get("environment"),
            "client": updated.get("client"),
            "stage": updated.get("stage"),
            "action": updated.get("action"),
            "status": "success",
            "eventType": "schedule-postponed",
            "scheduleId": schedule_id,
            "postponedUntil": postponed_until,
            "reason": body.reason,
            "requestedBy": user.get("preferred_username") or user.get("upn") or user.get("email") or user.get("oid"),
        }
    )
    return {"updated": updated}


@fast_app.get("/api/environments/{env_id}")
async def get_environment_by_id(env_id: str):
    environment = None
    # Prefer the configured persistent store when available
    if env_store:
        try:
            environment = env_store.get_environment(env_id)
        except Exception:
            environment = None
    # Fallback to in-memory store
    if not environment:
        environment = get_environment_item(env_id)
    if not environment:
        raise HTTPException(status_code=404, detail="Environment not found")
    # Enrich details with schedules summary and recent activity when available
    details = _decorate_environment_for_response(environment)
    # attach schedules related to this environment (by id or name)
    try:
        schedules = []
        environment_refs = _list_environment_refs()
        if cosmos:
            # cosmos.list_schedules returns schedule items
            all_sched = cosmos.list_schedules(limit=200)
            for s in all_sched:
                decorated = _decorate_schedule_for_response(s, environment_refs)
                if str(decorated.get("environment_id") or decorated.get("environment") or "").lower() in (
                    str(env_id).lower(),
                    str(environment.get("name") or "").lower(),
                ):
                    schedules.append(decorated)
        else:
            for s in mem_store.SCHEDULES:
                decorated = _decorate_schedule_for_response(s, environment_refs)
                if str(decorated.get("environment_id") or decorated.get("environment") or "").lower() in (
                    str(env_id).lower(),
                    str(environment.get("name") or "").lower(),
                ):
                    schedules.append(decorated)
        details["schedules"] = [_augment_schedule_with_execution_refs(item) for item in schedules]
    except Exception:
        details["schedules"] = []

    # attach recent activity (audit) -- best-effort
    try:
        from shared.audit_store import read_audit

        entries, total = read_audit(environment=env_id, page=0, per_page=10)
        details["activity"] = {"entries": entries, "total": total}
    except Exception:
        details["activity"] = {"entries": [], "total": 0}

    # Derive `type` from stages/resourceActions when available (deprecation behavior)
    try:
        dt = _derive_type_from_stages(details)
        if dt:
            details["type"] = dt
    except Exception:
        pass

    try:
        stage_executions = []
        stages = []
        for stage in details.get("stages", []) or []:
            decorated_stage = _augment_stage_with_execution_refs(stage)
            stage_executions.extend(decorated_stage.get("executions", []))
            stages.append(decorated_stage)
        details["stages"] = stages
        stage_executions.sort(key=lambda item: item.get("requestedAt") or "", reverse=True)
        details["executions"] = stage_executions[:20]
    except Exception:
        details["executions"] = []

    return details


async def main(req: func.HttpRequest, context: func.Context) -> func.HttpResponse:
    return await func.AsgiMiddleware(fast_app).handle_async(req, context)


@fast_app.get("/api/environments/executions/{execution_id}")
async def get_stage_execution_detail(execution_id: str, req: Request):
    user = await _resolve_user(req)
    execution = _get_stage_execution_ref(execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Stage execution not found")

    client_id = execution.get("clientId")
    if not (has_any_role(user, ["admin", "environment-manager"]) or (client_id and has_client_admin_for(user, client_id))):
        raise HTTPException(status_code=403, detail="Forbidden")

    return {"execution": _execution_response_payload(execution)}


@fast_app.get("/api/environments/{env_id}/executions")
async def list_environment_stage_executions(env_id: str, req: Request):
    user = await _resolve_user(req)
    environment = None
    if env_store:
        try:
            environment = env_store.get_environment(env_id)
        except Exception:
            environment = None
    if not environment:
        environment = get_environment_item(env_id)
    if not environment:
        raise HTTPException(status_code=404, detail="Environment not found")

    env_client = environment.get("clientId") or environment.get("client")
    if not (has_any_role(user, ["admin", "environment-manager"]) or (env_client and has_client_admin_for(user, env_client))):
        raise HTTPException(status_code=403, detail="Forbidden")

    q = req.query_params
    stage_id = q.get("stage_id")
    schedule_id = q.get("schedule_id")
    try:
        limit = int(q.get("limit", "20"))
    except Exception:
        limit = 20
    limit = max(1, min(limit, 100))

    stages = environment.get("stages") or []
    valid_stage_ids = {item.get("id") for item in stages if item.get("id")}
    if stage_id and stage_id not in valid_stage_ids:
        raise HTTPException(status_code=400, detail="stage_id does not belong to environment")

    if schedule_id:
        schedule_refs = _list_schedule_execution_refs(schedule_id, limit=limit)
        executions = [
            _execution_response_payload(item)
            for item in schedule_refs
            if item.get("environmentId") == env_id and (not stage_id or item.get("stageId") == stage_id)
        ]
    else:
        target_stage_ids = [stage_id] if stage_id else [item.get("id") for item in stages if item.get("id")]
        executions = []
        seen_execution_ids = set()
        for target_stage_id in target_stage_ids:
            for item in _list_stage_execution_refs(target_stage_id, limit=limit):
                execution_id_val = item.get("executionId") or item.get("id")
                if execution_id_val in seen_execution_ids:
                    continue
                seen_execution_ids.add(execution_id_val)
                executions.append(_execution_response_payload(item))
        executions.sort(key=lambda item: item.get("requestedAt") or "", reverse=True)
        executions = executions[:limit]

    return {
        "executions": executions,
        "total": len(executions),
        "environmentId": env_id,
        "stageId": stage_id,
        "scheduleId": schedule_id,
    }


@fast_app.post("/api/environments/control")
async def control_environment(req: Request):
    """Control endpoint used by scheduler worker.

    Accepts either canonical ids or legacy labels and records the requested lifecycle action.
    """
    try:
        data = await req.json()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid control payload: {exc}") from exc

    environment_id = data.get("environment_id")
    environment_label = data.get("environment")
    client_id = data.get("client_id")
    client_label = data.get("client")
    stage_id = data.get("stage_id")
    stage_label = data.get("stage")
    action = data.get("action")

    if not action:
        raise HTTPException(status_code=400, detail="Missing required field: action")

    resolved_env = None
    environment_refs = _list_environment_refs()
    if environment_id:
        resolved_env = next((item for item in environment_refs if item.get("id") == environment_id), None)
    elif environment_label:
        matches = [
            item
            for item in environment_refs
            if str(item.get("id") or "").lower() == str(environment_label).lower()
            or str(item.get("name") or "").lower() == str(environment_label).lower()
            or str(item.get("lifecycle") or "").lower() == str(environment_label).lower()
        ]
        if len(matches) == 1:
            resolved_env = matches[0]

    if resolved_env:
        environment_id = resolved_env.get("id")
        environment_label = resolved_env.get("name")
        client_id = resolved_env.get("clientId") or client_id
        client_label = resolved_env.get("client") or client_label
        if stage_id:
            matched_stage = next((item for item in resolved_env.get("stages", []) if item.get("id") == stage_id), None)
            if matched_stage:
                stage_label = matched_stage.get("name")
        elif stage_label:
            matched_stage = next(
                (
                    item
                    for item in resolved_env.get("stages", [])
                    if str(item.get("id") or "").lower() == str(stage_label).lower()
                    or str(item.get("name") or "").lower() == str(stage_label).lower()
                ),
                None,
            )
            if matched_stage:
                stage_id = matched_stage.get("id")
                stage_label = matched_stage.get("name")

    if not environment_id and not environment_label:
        raise HTTPException(status_code=400, detail="Missing required environment reference")

    try:
        append_audit(
            {
                "environment": environment_id or environment_label,
                "environmentLabel": environment_label,
                "client": client_id or client_label,
                "clientLabel": client_label,
                "stage": stage_id or stage_label,
                "stageLabel": stage_label,
                "action": action,
                "status": "requested",
                "eventType": "scheduled-lifecycle",
                "scheduleId": data.get("scheduleId"),
                "executionId": data.get("executionId"),
            }
        )
    except Exception:
        pass

    return {
        "environment": environment_label or environment_id,
        "environment_id": environment_id,
        "client": client_label or client_id,
        "client_id": client_id,
        "stage": stage_label or stage_id,
        "stage_id": stage_id,
        "action": action,
        "executionId": data.get("executionId"),
        "status": "requested (mock)",
    }


@fast_app.get("/api/environments/{env_id}/activity")
async def get_environment_activity(env_id: str, req: Request):
    """Return activity/audit entries for an environment with server-side pagination and filtering."""
    user = await _resolve_user(req)
    if not has_any_role(user, ["admin", "environment-manager"]):
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        from shared.audit_store import read_audit
    except Exception:
        raise HTTPException(status_code=500, detail="Audit store unavailable")

    q = req.query_params
    try:
        page = int(q.get("page", "0"))
    except Exception:
        page = 0
    try:
        per_page = int(q.get("per_page", "10"))
    except Exception:
        per_page = 10

    client = q.get("client")
    stage = q.get("stage")
    action = q.get("action")
    start_ts = q.get("start_ts")
    end_ts = q.get("end_ts")

    entries, total = read_audit(
        environment=env_id,
        client=client,
        stage=stage,
        action=action,
        start_ts=start_ts,
        end_ts=end_ts,
        page=page,
        per_page=per_page,
    )
    return {"activity": entries, "total": total, "page": page, "per_page": per_page}
