import os
import json
from typing import List, Any, Dict
import logging

logger = logging.getLogger("shared.authz")


def _as_list(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v) for v in value]
    # handle comma-separated strings
    s = str(value)
    if "," in s:
        return [p.strip() for p in s.split(",") if p.strip()]
    return [s]


def get_roles_from_claims(claims: Dict[str, Any]) -> List[str]:
    """Extract application role names from a token claims dict.

    Supports common AAD claim shapes and optional group->role mapping via
    the `AAD_GROUP_ROLE_MAP` environment variable (JSON object mapping group id -> role name).
    """
    if not claims:
        return []

    roles: List[str] = []

    # Common role claim names - allow list of strings or list of objects
    for key in ("roles", "role", "http://schemas.microsoft.com/ws/2008/06/identity/claims/role", "roles_claim"):
        if key in claims:
            raw = claims.get(key)
            # if it's a list of dicts, try to extract common fields
            if isinstance(raw, list) and raw and isinstance(raw[0], dict):
                for item in raw:
                    for fld in ("value", "role", "name"):
                        if fld in item and item.get(fld):
                            roles.append(str(item.get(fld)))
                            break
            else:
                roles.extend(_as_list(raw))

    # Application permissions/scopes (optional) - split scopes
    if "scp" in claims:
        scp = claims.get("scp")
        if isinstance(scp, str):
            roles.extend([s.strip() for s in scp.split() if s.strip()])
        else:
            roles.extend(_as_list(scp))

    # AAD groups claim contains GUIDs; allow mapping to app roles via env var
    group_map_json = os.environ.get("AAD_GROUP_ROLE_MAP")
    if group_map_json:
        try:
            group_map = json.loads(group_map_json)
            groups = _as_list(claims.get("groups") or claims.get("group"))
            for g in groups:
                mapped = group_map.get(g)
                if mapped:
                    roles.append(mapped)
        except Exception:
            logger.exception("Error parsing AAD_GROUP_ROLE_MAP")

    # Deduplicate, normalize (lowercase) and return
    normalized = []
    for r in roles:
        if not r:
            continue
        # split composite role strings like 'role1 role2' if present
        for part in _as_list(r):
            v = str(part).strip()
            if v:
                normalized.append(v.lower())
    result = list(dict.fromkeys(normalized))
    logger.debug("get_roles_from_claims -> extracted roles: %s", result)
    return result


def has_any_role(claims: Dict[str, Any], allowed: List[str]) -> bool:
    user_roles = get_roles_from_claims(claims)
    if not user_roles:
        return False
    allowed_lower = [str(a).lower() for a in allowed]

    # Direct or pattern match
    for r in user_roles:
        if r in allowed_lower:
            return True
    # allow common synonyms: environment-manager <- environment-admin, envadmin
    if "environment-manager" in allowed_lower:
        for r in user_roles:
            # treat common synonyms as allowed: e.g. 'environment-admin', 'envadmin', 'env-manager'
            if ("environment" in r) or ("admin" in r or "manager" in r or r.startswith("env")):
                return True

    # match wildcard-like client-scoped roles (e.g., client-admin:client-a)
    for a in allowed_lower:
        if ":" in a:
            # allowed pattern contains scope, require exact match
            for r in user_roles:
                if r == a:
                    return True

    return False


def has_client_admin_for(claims: Dict[str, Any], client: str) -> bool:
    """Return True if the caller is a client-admin for the given client.

    Supports role shapes:
    - `client-admin` with claim `client` or `client_ids` containing the client
    - `client-admin:<clientId>` role string mapped directly
    """
    if not claims:
        return False
    roles = get_roles_from_claims(claims)
    if not roles:
        return False

    client_lc = str(client).lower()

    # direct scoped role like 'client-admin:client-a'
    for r in roles:
        if isinstance(r, str) and r.startswith("client-admin:"):
            _, _, rc = r.partition(":")
            if rc.lower() == client_lc:
                return True

    # generic client-admin role with claim scoping
    if "client-admin" in roles:
        # claim may include 'client' or 'client_ids'
        c = claims.get("client") or claims.get("client_id") or claims.get("clientId")
        if c and str(c).lower() == client_lc:
            return True
        client_ids = claims.get("client_ids") or claims.get("clients") or claims.get("clientIds")
        if client_ids:
            if isinstance(client_ids, list):
                if client_lc in [str(x).lower() for x in client_ids]:
                    return True
            else:
                # comma-separated string
                if "," in str(client_ids):
                    parts = [p.strip().lower() for p in str(client_ids).split(",")]
                    if client_lc in parts:
                        return True
                if str(client_ids).lower() == client_lc:
                    return True

    return False
