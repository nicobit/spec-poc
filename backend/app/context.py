
import azure.functions as func 
from fastapi import HTTPException
from app.services.authentication_service import verify_jwt

async def get_current_user(request: func.HttpRequest):
    """
    Validate JWT access token from Authorization header and return user principal.
    """
    token = request.headers.get("Authorization")
    if token is None or not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = token[len("Bearer "):]

    
    claims =  verify_jwt(token)  # verify signature and audience
    if not claims:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    return claims  # or return entire claims/object as needed