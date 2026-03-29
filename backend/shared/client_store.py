from __future__ import annotations

from copy import deepcopy
from datetime import datetime
from typing import Any, Dict, List, Optional

from .client_model import ClientModel


CLIENTS: List[Dict[str, Any]] = [
    {
        "seed": True,
        "id": "client-001",
        "name": "Client 001",
        "shortCode": "CLIENT-001",
        "country": "CH",
        "timezone": "Europe/Zurich",
        "retired": False,
        "clientAdmins": [
            {"type": "user", "id": "nico.bitetti@example.com", "displayName": "Nico Bitetti"},
        ],
    },
    {
        "seed": True,
        "id": "client-002",
        "name": "Client 002",
        "shortCode": "CLIENT-002",
        "country": "DE",
        "timezone": "Europe/Berlin",
        "retired": False,
        "clientAdmins": [
            {"type": "user", "id": "ops.client002@example.com", "displayName": "Client 002 Ops"},
        ],
    },
    {
        "seed": True,
        "id": "client-003",
        "name": "Client 003",
        "shortCode": "CLIENT-003",
        "country": "NL",
        "timezone": "Europe/Amsterdam",
        "retired": False,
        "clientAdmins": [
            {"type": "user", "id": "ops.client003@example.com", "displayName": "Client 003 Ops"},
        ],
    },
]


def list_clients(*, include_retired: bool = False) -> List[Dict[str, Any]]:
    items = deepcopy(CLIENTS)
    if include_retired:
        return items
    return [client for client in items if not client.get("retired")]


def get_client(client_id: str) -> Optional[Dict[str, Any]]:
    for client in CLIENTS:
        if client.get("id") == client_id:
            return deepcopy(client)
    return None


def _find_client_ref(client_id: str) -> Optional[Dict[str, Any]]:
    for client in CLIENTS:
        if client.get("id") == client_id:
            return client
    return None


def _assert_unique(candidate: Dict[str, Any], *, exclude_id: Optional[str] = None) -> None:
    short_code = str(candidate.get("shortCode") or "").strip().lower()
    name = str(candidate.get("name") or "").strip().lower()

    for existing in CLIENTS:
        if exclude_id and existing.get("id") == exclude_id:
            continue
        if str(existing.get("shortCode") or "").strip().lower() == short_code:
            raise ValueError("Conflict: shortCode must be unique")
        if str(existing.get("name") or "").strip().lower() == name:
            raise ValueError("Conflict: name must be unique")


def create_client(data: Dict[str, Any]) -> Dict[str, Any]:
    payload = deepcopy(data)
    ClientModel.parse_obj(payload)
    _assert_unique(payload)
    CLIENTS.append(payload)
    return deepcopy(payload)


def update_client(client_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    ref = _find_client_ref(client_id)
    if not ref:
        return None
    payload = deepcopy(data)
    payload["id"] = client_id
    ClientModel.parse_obj(payload)
    _assert_unique(payload, exclude_id=client_id)
    ref.clear()
    ref.update(payload)
    return deepcopy(ref)


def retire_client(client_id: str, *, retired_by: Optional[str] = None) -> Optional[Dict[str, Any]]:
    ref = _find_client_ref(client_id)
    if not ref:
        return None
    ref["retired"] = True
    ref["retiredAt"] = datetime.utcnow().isoformat() + "Z"
    ref["retiredBy"] = retired_by
    return deepcopy(ref)


def resolve_client_reference(value: Optional[str]) -> Optional[Dict[str, Any]]:
    if value is None:
        return None
    label = str(value).strip().lower()
    if not label:
        return None
    matches = [
        client
        for client in CLIENTS
        if str(client.get("id") or "").lower() == label
        or str(client.get("shortCode") or "").lower() == label
        or str(client.get("name") or "").lower() == label
    ]
    if len(matches) == 1:
        return deepcopy(matches[0])
    if len(matches) > 1:
        raise ValueError("Ambiguous client label")
    return None
