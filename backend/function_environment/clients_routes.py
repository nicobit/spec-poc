import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import ValidationError

from shared.audit_store import append_audit
from shared.authz import has_any_role
from shared.client_store import create_client as create_client_inmemory
from shared.client_store import get_client as get_client_item
from shared.client_store import retire_client as retire_client_inmemory
from shared.client_store import update_client as update_client_inmemory

from .common import (
    _client_response_payload,
    _list_client_refs,
    _resolve_user,
    _validation_error_detail,
)
from .models import ClientIn, ClientRetireIn, ClientsBulkRetireIn


router = APIRouter()


def _actor_id(user: dict) -> Optional[str]:
    return user.get("preferred_username") or user.get("upn") or user.get("email") or user.get("oid")


@router.get("/api/clients")
@router.get("/api/clients/")
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


@router.get("/api/clients/{client_id}")
async def get_client(client_id: str, req: Request):
    user = await _resolve_user(req)
    if not has_any_role(user, ["admin", "environment-manager"]):
        raise HTTPException(status_code=403, detail="Forbidden")
    item = get_client_item(client_id)
    if not item:
        raise HTTPException(status_code=404, detail="Client not found")
    return _client_response_payload(item)


@router.post("/api/clients")
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

    append_audit(
        {
            "client": created.get("id"),
            "clientName": created.get("name"),
            "shortCode": created.get("shortCode"),
            "action": "create",
            "status": "success",
            "eventType": "client-created",
            "requestedBy": _actor_id(user),
        }
    )
    return {"created": _client_response_payload(created)}


@router.put("/api/clients/{client_id}")
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

    append_audit(
        {
            "client": client_id,
            "clientName": updated.get("name") if updated else payload.get("name"),
            "shortCode": updated.get("shortCode") if updated else payload.get("shortCode"),
            "action": "update",
            "status": "success",
            "eventType": "client-updated",
            "requestedBy": _actor_id(user),
        }
    )
    return {"updated": _client_response_payload(updated)}


@router.post("/api/clients/{client_id}/retire")
async def retire_client(client_id: str, req: Request, body: ClientRetireIn):
    user = await _resolve_user(req)
    if not has_any_role(user, ["admin", "environment-manager"]):
        raise HTTPException(status_code=403, detail="Forbidden")

    existing = get_client_item(client_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Client not found")

    actor = _actor_id(user)
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


@router.post("/api/clients/retire")
async def retire_clients_bulk(req: Request, body: ClientsBulkRetireIn):
    user = await _resolve_user(req)
    if not has_any_role(user, ["admin", "environment-manager"]):
        raise HTTPException(status_code=403, detail="Forbidden")

    actor = _actor_id(user)
    updated_items = []
    for client_id in body.ids:
        existing = get_client_item(client_id)
        if not existing:
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
