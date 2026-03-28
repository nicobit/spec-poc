# app/auth/roles.py
from fastapi import Depends, HTTPException, status
from typing import Iterable, Dict, Any, Optional, Set, List
#from app.fastapi_app import get_settings  # or wherever your settings live
from fastapi import Request
from app.auth.jwt import get_validator

#settings = get_settings()
validator = get_validator()

async def get_user_from_auth(request: Request) -> Dict[str, Any]:
    """Return validated user claims or raise 401."""
    authz = request.headers.get("Authorization")
    try:
        return await validator.validate(authz)
    except Exception as e:
        # your existing create_fastapi_app already has a similar helper; you can reuse it
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

class RoleChecker:
    def __init__(self, *required_roles: str):
        self.required: Set[str] = {r for r in required_roles if r}

    async def __call__(self, user: Dict[str, Any] = Depends(get_user_from_auth)) -> Dict[str, Any]:
        roles: List[str] = user.get("roles") or user.get("app_roles") or []
        # If group-based RBAC, you'd look at `groups` or enforce via Graph call.
        has = self.required.issubset(set(roles))
        if not has:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden (missing role)")
        return user

def require_scopes(*scopes: str):
    """Optional: scope-based protection (uses 'scp' claim)."""
    required = set(scopes)
    async def _dep(user: Dict[str, Any] = Depends(get_user_from_auth)):
        scp = set((user.get("scp") or "").split()) if user.get("scp") else set()
        if not required.issubset(scp):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden (missing scope)")
        return user
    return _dep


admin_only = RoleChecker("Admin")  # this string must match the App Role name in Entra ID
auth_only = RoleChecker()  # any authenticated user


# Example usage:
# in create_fastapi_app() after you defined get_user
#from app.auth.roles import RoleChecker

#admin_only = RoleChecker("Admin")  # this string must match the App Role name in Entra ID

#@app.put("/llm/quota/{target_user_id}")
#async def set_quota(target_user_id: str, quota: int, user=Depends(admin_only)):
#    usage.set_quota(target_user_id, quota)
#    return {"user_id": target_user_id, "quota": quota}

# You can similarly protect other routes:
# router = APIRouter(prefix="/admin", dependencies=[Depends(admin_only)])
