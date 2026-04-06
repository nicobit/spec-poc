import logging
import inspect
from typing import List

import azure.functions as func
from fastapi import FastAPI, Request, HTTPException
from fastapi.encoders import jsonable_encoder

from shared.context import get_current_user
from shared.user_profile_store import get_user_profile_store
from app.utils.cors_helper import CORSHelper

fast_app = FastAPI()

# enable CORS
CORSHelper.set_CORS(fast_app)

logger = logging.getLogger("function_user_profiles")


async def _resolve_user(req: Request):
    try:
        maybe = get_current_user(req)
    except TypeError:
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


@fast_app.get("/api/users/me/env-favorites")
async def get_favorites(request: Request):
    user = await _resolve_user(request)
    user_id = user.get("preferred_username") or user.get("sub") or user.get("oid")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    store = get_user_profile_store()
    try:
        favs = store.get_favorites(user_id)
    except Exception as exc:
        logger.exception("Failed to read favorites for %s", user_id)
        raise HTTPException(status_code=500, detail=str(exc))
    return {"favorites": favs}


@fast_app.put("/api/users/me/env-favorites")
async def put_favorites(request: Request):
    user = await _resolve_user(request)
    user_id = user.get("preferred_username") or user.get("sub") or user.get("oid")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    body = await request.json()
    favs = body.get("favorites") if isinstance(body, dict) else None
    if favs is None:
        raise HTTPException(status_code=400, detail="favorites array required")
    store = get_user_profile_store()
    try:
        res = store.set_favorites(user_id, list(favs))
    except Exception as exc:
        logger.exception("Failed to set favorites for %s", user_id)
        raise HTTPException(status_code=500, detail=str(exc))
    return {"favorites": res}


@fast_app.post("/api/users/me/env-favorites")
async def post_favorite(request: Request):
    user = await _resolve_user(request)
    user_id = user.get("preferred_username") or user.get("sub") or user.get("oid")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    body = await request.json()
    env_id = body.get("id") if isinstance(body, dict) else None
    if not env_id:
        raise HTTPException(status_code=400, detail="id is required")
    store = get_user_profile_store()
    try:
        res = store.add_favorite(user_id, env_id)
    except Exception as exc:
        logger.exception("Failed to add favorite for %s", user_id)
        raise HTTPException(status_code=500, detail=str(exc))
    return {"favorites": res}


@fast_app.delete("/api/users/me/env-favorites/{env_id}")
async def delete_favorite(env_id: str, request: Request):
    user = await _resolve_user(request)
    user_id = user.get("preferred_username") or user.get("sub") or user.get("oid")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    store = get_user_profile_store()
    try:
        store.remove_favorite(user_id, env_id)
    except Exception as exc:
        logger.exception("Failed to remove favorite for %s", user_id)
        raise HTTPException(status_code=500, detail=str(exc))
    return None
