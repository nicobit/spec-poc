from __future__ import annotations

import logging
import os
import uuid
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from azure.cosmos import CosmosClient, PartitionKey, exceptions

_logger = logging.getLogger(__name__)


COSMOS_CONN = os.environ.get("COSMOS_CONNECTION_STRING")
COSMOS_DB = os.environ.get("COSMOS_DB_NAME", "adminportal")
COSMOS_CHAT_CONTAINER = os.environ.get("COSMOS_CHAT_CONTAINER_NAME", "chatsessions")

CHAT_HISTORY_TOKEN_BUDGET: int = int(os.environ.get("CHAT_HISTORY_TOKEN_BUDGET", "3000"))
CHAT_SUMMARIZE_THRESHOLD: int = int(os.environ.get("CHAT_SUMMARIZE_THRESHOLD", "6"))
CHAT_SESSION_TTL_DAYS: int = int(os.environ.get("CHAT_SESSION_TTL_DAYS", "7"))

# In-memory fallback; keyed by session id
CHAT_SESSIONS: Dict[str, Dict[str, Any]] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Session data helpers (pure functions — no I/O)
# ---------------------------------------------------------------------------

def _auto_name() -> str:
    """Generate a default session name from the current UTC time."""
    return f"Chat — {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}"


def new_session(user_id: str, name: Optional[str] = None) -> Dict[str, Any]:
    """Return a new ChatSession dict with all required fields."""
    return {
        "id": str(uuid.uuid4()),
        "userId": user_id,
        "name": (name or _auto_name())[:120],
        "createdAt": _now_iso(),
        "updatedAt": _now_iso(),
        "summary": None,
        "summarizedUpTo": 0,
        "turns": [],
        "ttl": CHAT_SESSION_TTL_DAYS * 86400,
    }


def append_turn(session: Dict[str, Any], role: str, content: str) -> None:
    """Append a turn and update updatedAt in-place."""
    session["turns"].append({"role": role, "content": content, "ts": _now_iso()})
    session["updatedAt"] = _now_iso()


def needs_summarization(session: Dict[str, Any]) -> bool:
    """Return True if the number of unsummarized turns has reached the threshold."""
    unsummarized = len(session.get("turns", [])) - session.get("summarizedUpTo", 0)
    return unsummarized >= CHAT_SUMMARIZE_THRESHOLD


def build_history_messages(session: Dict[str, Any]) -> List[Dict[str, str]]:
    """Apply token-budget windowing and return role/content dicts to inject into the prompt.

    Walks turns newest → oldest, including each turn while the cumulative estimated
    token count stays within CHAT_HISTORY_TOKEN_BUDGET.  Token estimation uses
    ``len(content) // 4`` (no external tokenizer dependency).

    If a prior summary exists it is prepended as a ``system`` message.
    """
    budget = CHAT_HISTORY_TOKEN_BUDGET
    turns = session.get("turns", [])
    selected: List[Dict[str, str]] = []
    for turn in reversed(turns):
        tokens = len(turn.get("content", "")) // 4
        if tokens > budget:
            break
        budget -= tokens
        selected.insert(0, {"role": turn["role"], "content": turn["content"]})

    if len(selected) < len(turns):
        _logger.warning(
            "Chat history budget exhausted for session %s: included %d of %d turns.",
            session.get("id", "unknown"),
            len(selected),
            len(turns),
        )

    result: List[Dict[str, str]] = []
    if session.get("summary"):
        result.append(
            {"role": "system", "content": f"[Earlier conversation summary]: {session['summary']}"}
        )
    result.extend(selected)
    return result


# ---------------------------------------------------------------------------
# In-memory store (used when COSMOS_CONNECTION_STRING is absent)
# ---------------------------------------------------------------------------

def get_session_inmemory(session_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    s = CHAT_SESSIONS.get(session_id)
    if s and s.get("userId") == user_id:
        return deepcopy(s)
    return None


def put_session_inmemory(session: Dict[str, Any]) -> None:
    CHAT_SESSIONS[session["id"]] = deepcopy(session)


def list_sessions_inmemory(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    sessions = [
        deepcopy(s) for s in CHAT_SESSIONS.values()
        if s.get("userId") == user_id
    ]
    sessions.sort(key=lambda s: s.get("updatedAt", ""), reverse=True)
    # Return lightweight summaries (no turns payload)
    return [_session_summary(s) for s in sessions[:limit]]


def rename_session_inmemory(session_id: str, user_id: str, name: str) -> bool:
    """Rename session in-place. Returns True if found and owned."""
    s = CHAT_SESSIONS.get(session_id)
    if not s or s.get("userId") != user_id:
        return False
    s["name"] = name[:120]
    s["updatedAt"] = _now_iso()
    return True


def delete_session_inmemory(session_id: str, user_id: str) -> bool:
    """Hard-delete. Returns True if found and owned."""
    s = CHAT_SESSIONS.get(session_id)
    if not s or s.get("userId") != user_id:
        return False
    del CHAT_SESSIONS[session_id]
    return True


def _session_summary(session: Dict[str, Any]) -> Dict[str, Any]:
    """Return a lightweight dict safe to return as a list item (no turns)."""
    return {
        "id": session["id"],
        "name": session.get("name") or _auto_name_from_created(session),
        "createdAt": session.get("createdAt", ""),
        "updatedAt": session.get("updatedAt", ""),
        "turnCount": len(session.get("turns", [])),
    }


def _auto_name_from_created(session: Dict[str, Any]) -> str:
    """Graceful default for legacy sessions that have no name field."""
    ts = session.get("createdAt", "")
    try:
        dt = datetime.fromisoformat(ts)
        return f"Chat — {dt.strftime('%Y-%m-%d %H:%M')}"
    except Exception:
        return "Chat"


# ---------------------------------------------------------------------------
# Cosmos store
# ---------------------------------------------------------------------------

class CosmosChatSessionStore:
    def __init__(self) -> None:
        if not COSMOS_CONN:
            raise RuntimeError("COSMOS_CONNECTION_STRING not set")
        self.client = CosmosClient.from_connection_string(COSMOS_CONN)
        self._db = self._get_or_create_db(COSMOS_DB)
        self._container = self._get_or_create_container(COSMOS_CHAT_CONTAINER)

    def _get_or_create_db(self, name: str):
        try:
            return self.client.create_database_if_not_exists(id=name)
        except exceptions.CosmosHttpResponseError:
            return self.client.get_database_client(name)

    def _get_or_create_container(self, name: str):
        try:
            return self._db.create_container_if_not_exists(
                id=name,
                partition_key=PartitionKey(path="/userId"),
                default_ttl=-1,  # rely on per-document ttl field
            )
        except exceptions.CosmosHttpResponseError:
            return self._db.get_container_client(name)

    def get_session(self, session_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        try:
            return self._container.read_item(item=session_id, partition_key=user_id)
        except exceptions.CosmosResourceNotFoundError:
            return None

    def put_session(self, session: Dict[str, Any]) -> None:
        self._container.upsert_item(session)

    def list_sessions(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        query = (
            "SELECT c.id, c.name, c.createdAt, c.updatedAt, ARRAY_LENGTH(c.turns) AS turnCount "
            "FROM c WHERE c.userId = @uid ORDER BY c.updatedAt DESC OFFSET 0 LIMIT @lim"
        )
        params = [{"name": "@uid", "value": user_id}, {"name": "@lim", "value": limit}]
        items = list(self._container.query_items(query=query, parameters=params, partition_key=user_id))
        return [
            {
                "id": i.get("id", ""),
                "name": i.get("name") or _auto_name_from_created(i),
                "createdAt": i.get("createdAt", ""),
                "updatedAt": i.get("updatedAt", ""),
                "turnCount": i.get("turnCount") or 0,
            }
            for i in items
        ]

    def rename_session(self, session_id: str, user_id: str, name: str) -> bool:
        session = self.get_session(session_id, user_id)
        if session is None:
            return False
        session["name"] = name[:120]
        session["updatedAt"] = _now_iso()
        self._container.upsert_item(session)
        return True

    def delete_session(self, session_id: str, user_id: str) -> bool:
        try:
            self._container.delete_item(item=session_id, partition_key=user_id)
            return True
        except exceptions.CosmosResourceNotFoundError:
            return False


# ---------------------------------------------------------------------------
# Lazy proxy
# ---------------------------------------------------------------------------

class _LazyChatSessionStoreProxy:
    def __init__(self) -> None:
        self._store: Optional[CosmosChatSessionStore] = None

    def _ensure(self) -> CosmosChatSessionStore:
        if self._store is None:
            self._store = CosmosChatSessionStore()
        return self._store

    def get_session(self, session_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        return self._ensure().get_session(session_id, user_id)

    def put_session(self, session: Dict[str, Any]) -> None:
        self._ensure().put_session(session)

    def list_sessions(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        return self._ensure().list_sessions(user_id, limit)

    def rename_session(self, session_id: str, user_id: str, name: str) -> bool:
        return self._ensure().rename_session(session_id, user_id, name)

    def delete_session(self, session_id: str, user_id: str) -> bool:
        return self._ensure().delete_session(session_id, user_id)


def get_chat_session_store() -> Optional[_LazyChatSessionStoreProxy]:
    """Return a LazyProxy if COSMOS_CONNECTION_STRING is set, otherwise None."""
    if not COSMOS_CONN:
        return None
    return _LazyChatSessionStoreProxy()
