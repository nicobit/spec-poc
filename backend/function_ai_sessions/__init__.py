"""Azure Function adapter for AI session management endpoints.

Routes:
  GET    /api/ai/sessions                  — list sessions for current user
  GET    /api/ai/sessions/{session_id}     — load turns for a session
  PATCH  /api/ai/sessions/{session_id}     — rename a session
  DELETE /api/ai/sessions/{session_id}     — delete a session
"""
import azure.functions as func
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field
from shared.context import get_current_user
from shared.utils.nb_logger import NBLogger
from shared.chat_session_store import (
    build_history_messages,
    get_chat_session_store,
    get_session_inmemory,
    list_sessions_inmemory,
    rename_session_inmemory,
    delete_session_inmemory,
    _session_summary,
)

logger = NBLogger().Log()
fast_app = FastAPI()

SESSION_NAME_MAX = 120


class RenameRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=SESSION_NAME_MAX)


def _resolve_user_id(user: dict) -> str:
    return (
        (user or {}).get("oid")
        or (user or {}).get("sub")
        or (user or {}).get("preferred_username")
        or "anonymous"
    )


async def _require_user(req: Request) -> dict:
    try:
        user = await get_current_user(req)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Auth error: %s", exc)
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user


# ---------------------------------------------------------------------------
# GET /api/ai/sessions — list sessions
# ---------------------------------------------------------------------------

@fast_app.get("/api/ai/sessions")
async def list_sessions(req: Request, limit: int = 50):
    user = await _require_user(req)
    user_id = _resolve_user_id(user)
    limit = min(max(1, limit), 50)

    store = get_chat_session_store()
    if store:
        try:
            sessions = store.list_sessions(user_id, limit=limit)
        except Exception as exc:
            logger.error("list_sessions Cosmos error: %s", exc)
            raise HTTPException(status_code=503, detail="Session store unavailable")
    else:
        sessions = list_sessions_inmemory(user_id, limit=limit)

    return {"sessions": sessions}


# ---------------------------------------------------------------------------
# GET /api/ai/sessions/{session_id} — load turns for a session
# ---------------------------------------------------------------------------

@fast_app.get("/api/ai/sessions/{session_id}")
async def get_session(session_id: str, req: Request):
    user = await _require_user(req)
    user_id = _resolve_user_id(user)

    store = get_chat_session_store()
    if store:
        try:
            session = store.get_session(session_id, user_id)
        except Exception as exc:
            logger.error("get_session Cosmos error: %s", exc)
            raise HTTPException(status_code=503, detail="Session store unavailable")
    else:
        session = get_session_inmemory(session_id, user_id)

    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    history = build_history_messages(session)
    return {
        **_session_summary(session),
        "turns": history,
    }


# ---------------------------------------------------------------------------
# PATCH /api/ai/sessions/{session_id} — rename
# ---------------------------------------------------------------------------

@fast_app.patch("/api/ai/sessions/{session_id}")
async def rename_session(session_id: str, req: Request, body: RenameRequest):
    user = await _require_user(req)
    user_id = _resolve_user_id(user)

    store = get_chat_session_store()
    if store:
        try:
            found = store.rename_session(session_id, user_id, body.name)
        except Exception as exc:
            logger.error("rename_session Cosmos error: %s", exc)
            raise HTTPException(status_code=503, detail="Session store unavailable")
    else:
        found = rename_session_inmemory(session_id, user_id, body.name)

    if not found:
        raise HTTPException(status_code=404, detail="Session not found")

    return {"session_id": session_id, "name": body.name}


# ---------------------------------------------------------------------------
# DELETE /api/ai/sessions/{session_id} — hard-delete
# ---------------------------------------------------------------------------

@fast_app.delete("/api/ai/sessions/{session_id}", status_code=204)
async def delete_session(session_id: str, req: Request):
    user = await _require_user(req)
    user_id = _resolve_user_id(user)

    store = get_chat_session_store()
    if store:
        try:
            store.delete_session(session_id, user_id)
        except Exception as exc:
            logger.error("delete_session Cosmos error: %s", exc)
            raise HTTPException(status_code=503, detail="Session store unavailable")
    else:
        delete_session_inmemory(session_id, user_id)

    # 204 — idempotent: not-found is not surfaced as an error


async def main(req: func.HttpRequest, context: func.Context) -> func.HttpResponse:
    return await func.AsgiMiddleware(fast_app).handle_async(req, context)
