from fastapi import APIRouter, HTTPException, Request

from shared.user_profile_store import get_user_profile_store

from .common import _resolve_user


router = APIRouter()


def _user_id_from_claims(user) -> str | None:
    if not isinstance(user, dict):
        return None
    return user.get("preferred_username") or user.get("sub") or user.get("oid")


@router.get("/api/users/me/env-favorites")
async def get_env_favorites(request: Request):
    user = await _resolve_user(request)
    user_id = _user_id_from_claims(user)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    store = get_user_profile_store()
    return {"favorites": store.get_favorites(user_id)}


@router.put("/api/users/me/env-favorites")
async def put_env_favorites(request: Request):
    user = await _resolve_user(request)
    user_id = _user_id_from_claims(user)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    body = await request.json()
    favorites = body.get("favorites") if isinstance(body, dict) else None
    if favorites is None:
        raise HTTPException(status_code=400, detail="favorites array required")
    store = get_user_profile_store()
    return {"favorites": store.set_favorites(user_id, list(favorites))}


@router.post("/api/users/me/env-favorites")
async def post_env_favorite(request: Request):
    user = await _resolve_user(request)
    user_id = _user_id_from_claims(user)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    body = await request.json()
    env_id = body.get("id") if isinstance(body, dict) else None
    if not env_id:
        raise HTTPException(status_code=400, detail="id is required")
    store = get_user_profile_store()
    return {"favorites": store.add_favorite(user_id, env_id)}


@router.delete("/api/users/me/env-favorites/{env_id}")
async def delete_env_favorite(env_id: str, request: Request):
    user = await _resolve_user(request)
    user_id = _user_id_from_claims(user)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    store = get_user_profile_store()
    store.remove_favorite(user_id, env_id)
    return None
