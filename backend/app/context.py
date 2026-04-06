
import azure.functions as func 
from fastapi import HTTPException
from app.services.authentication_service import verify_jwt
import os

async def get_current_user(request: func.HttpRequest):
    """
    Validate JWT access token from Authorization header and return user principal.
    """
    # Local developer convenience: allow anonymous requests when DEV_AUTH_ANONYMOUS is set.
    if os.environ.get("DEV_AUTH_ANONYMOUS", "false").lower() in ("1", "true", "yes"):
        # Return a simple mock user with admin privileges for local testing
        return {"preferred_username": "localdev", "roles": ["admin"]}

    token = request.headers.get("Authorization")
    if token is None or not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = token[len("Bearer "):]

    
    claims =  verify_jwt(token)  # verify signature and audience
    if not claims:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    return claims  # or return entire claims/object as needed


def get_user_id_from_claims(claims: dict) -> str | None:
    """Extract a stable user identifier from JWT claims.

    Prefer `preferred_username`, then `sub`, then `oid` for compatibility with
    different identity providers. Returns None if no suitable claim is present.
    """
    if not claims or not isinstance(claims, dict):
        return None
    return claims.get("preferred_username") or claims.get("sub") or claims.get("oid")