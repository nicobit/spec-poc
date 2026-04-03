"""Tests for shared.chat_session_store.

Covers the ChatSession data helpers, in-memory store, and factory function.
"""
from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_ROOT))

import pytest
from unittest.mock import patch

import shared.chat_session_store as store_module
from shared.chat_session_store import (
    new_session,
    append_turn,
    needs_summarization,
    build_history_messages,
    get_session_inmemory,
    put_session_inmemory,
    list_sessions_inmemory,
    rename_session_inmemory,
    delete_session_inmemory,
    get_chat_session_store,
    CHAT_SESSIONS,
)


@pytest.fixture(autouse=True)
def clear_sessions():
    """Isolate each test by clearing the in-memory store before and after."""
    CHAT_SESSIONS.clear()
    yield
    CHAT_SESSIONS.clear()


# ---------------------------------------------------------------------------
# AC-01 — new_session produces a valid entity
# ---------------------------------------------------------------------------

def test_new_session_has_required_fields():
    s = new_session("user-abc")
    assert s["id"]
    assert s["userId"] == "user-abc"
    assert s["createdAt"]
    assert s["updatedAt"]
    assert s["summary"] is None
    assert s["summarizedUpTo"] == 0
    assert s["turns"] == []
    assert s["ttl"] > 0


def test_new_session_id_is_uuid():
    import uuid
    s = new_session("u1")
    uuid.UUID(s["id"])  # raises ValueError if not a valid UUID


def test_new_sessions_have_unique_ids():
    ids = {new_session("u1")["id"] for _ in range(5)}
    assert len(ids) == 5


# ---------------------------------------------------------------------------
# AC-02 — append_turn grows the turns list
# ---------------------------------------------------------------------------

def test_append_turn_adds_user_turn():
    s = new_session("u1")
    append_turn(s, "user", "Hello")
    assert len(s["turns"]) == 1
    assert s["turns"][0]["role"] == "user"
    assert s["turns"][0]["content"] == "Hello"


def test_append_turn_adds_assistant_turn():
    s = new_session("u1")
    append_turn(s, "user", "Q")
    append_turn(s, "assistant", "A")
    assert len(s["turns"]) == 2
    assert s["turns"][1]["role"] == "assistant"


def test_append_turn_updates_updated_at():
    s = new_session("u1")
    original = s["updatedAt"]
    append_turn(s, "user", "msg")
    assert s["updatedAt"] >= original


# ---------------------------------------------------------------------------
# AC-03 — build_history_messages respects the token budget
# ---------------------------------------------------------------------------

def test_build_history_messages_empty_session():
    s = new_session("u1")
    assert build_history_messages(s) == []


def test_build_history_messages_returns_turns_within_budget():
    s = new_session("u1")
    append_turn(s, "user", "A" * 40)   # ≈10 tokens
    append_turn(s, "assistant", "B" * 40)  # ≈10 tokens
    with patch.object(store_module, "CHAT_HISTORY_TOKEN_BUDGET", 100):
        msgs = build_history_messages(s)
    roles = [m["role"] for m in msgs]
    assert "user" in roles
    assert "assistant" in roles


def test_build_history_messages_drops_oldest_turn_when_over_budget():
    s = new_session("u1")
    # Each turn is 1000 characters ≈ 250 tokens
    append_turn(s, "user", "old " * 250)
    append_turn(s, "assistant", "old_ans " * 125)
    append_turn(s, "user", "recent")
    with patch.object(store_module, "CHAT_HISTORY_TOKEN_BUDGET", 10):
        msgs = build_history_messages(s)
    # Only the last (recent) user turn should fit within 10 tokens
    contents = [m["content"] for m in msgs if m["role"] != "system"]
    assert any("recent" in c for c in contents)
    # Oldest large turn should be excluded
    assert not any("old " * 10 in c for c in contents)


# ---------------------------------------------------------------------------
# AC-04 — build_history_messages prepends summary as system message
# ---------------------------------------------------------------------------

def test_build_history_messages_prepends_summary():
    s = new_session("u1")
    s["summary"] = "User asked about client X failures."
    append_turn(s, "user", "What happened next?")
    msgs = build_history_messages(s)
    assert msgs[0]["role"] == "system"
    assert "User asked about client X failures." in msgs[0]["content"]


def test_build_history_messages_no_summary_no_system_prefix():
    s = new_session("u1")
    s["summary"] = None
    append_turn(s, "user", "Hello")
    msgs = build_history_messages(s)
    assert msgs[0]["role"] == "user"


# ---------------------------------------------------------------------------
# AC-05 — needs_summarization threshold logic
# ---------------------------------------------------------------------------

def test_needs_summarization_false_below_threshold():
    s = new_session("u1")
    with patch.object(store_module, "CHAT_SUMMARIZE_THRESHOLD", 6):
        for _ in range(5):
            append_turn(s, "user", "q")
            append_turn(s, "assistant", "a")
        # Only 10 turns but threshold is per unsummarized count; set to match
        s["summarizedUpTo"] = 5  # 5 unsummarized remaining
        assert not needs_summarization(s)


def test_needs_summarization_true_at_threshold():
    s = new_session("u1")
    with patch.object(store_module, "CHAT_SUMMARIZE_THRESHOLD", 6):
        for _ in range(3):
            append_turn(s, "user", "q")
            append_turn(s, "assistant", "a")
        s["summarizedUpTo"] = 0  # all 6 are unsummarized
        assert needs_summarization(s)


# ---------------------------------------------------------------------------
# AC-06 — in-memory store round-trip and isolation
# ---------------------------------------------------------------------------

def test_inmemory_store_roundtrip():
    s = new_session("u1")
    append_turn(s, "user", "hello")
    put_session_inmemory(s)
    loaded = get_session_inmemory(s["id"], "u1")
    assert loaded is not None
    assert loaded["id"] == s["id"]
    assert loaded["turns"][0]["content"] == "hello"


def test_inmemory_store_returns_deep_copy():
    s = new_session("u1")
    put_session_inmemory(s)
    loaded = get_session_inmemory(s["id"], "u1")
    loaded["turns"].append({"role": "user", "content": "mutated"})
    # Original in store should be unchanged
    stored = get_session_inmemory(s["id"], "u1")
    assert len(stored["turns"]) == 0


def test_inmemory_store_user_isolation():
    s = new_session("u1")
    put_session_inmemory(s)
    # A different user should not be able to read u1's session
    assert get_session_inmemory(s["id"], "u2") is None


def test_inmemory_store_returns_none_for_unknown_id():
    assert get_session_inmemory("non-existent-id", "u1") is None


# ---------------------------------------------------------------------------
# AC-07 — TTL is set to days × 86400
# ---------------------------------------------------------------------------

def test_ttl_respects_env_variable():
    with patch.object(store_module, "CHAT_SESSION_TTL_DAYS", 3):
        s = new_session("u1")
    assert s["ttl"] == 3 * 86400


# ---------------------------------------------------------------------------
# Factory function
# ---------------------------------------------------------------------------

def test_get_chat_session_store_returns_none_without_cosmos():
    with patch.object(store_module, "COSMOS_CONN", None):
        assert get_chat_session_store() is None


def test_get_chat_session_store_returns_proxy_with_cosmos():
    from shared.chat_session_store import _LazyChatSessionStoreProxy
    with patch.object(store_module, "COSMOS_CONN", "AccountEndpoint=https://fake.documents.azure.com:443/;AccountKey=dGVzdA==;"):
        result = get_chat_session_store()
    assert isinstance(result, _LazyChatSessionStoreProxy)


# ---------------------------------------------------------------------------
# FEAT-004 — new_session accepts optional name
# ---------------------------------------------------------------------------

def test_new_session_uses_provided_name():
    s = new_session("u1", name="My Investigation")
    assert s["name"] == "My Investigation"


def test_new_session_truncates_long_name():
    s = new_session("u1", name="X" * 200)
    assert len(s["name"]) == 120


def test_new_session_auto_name_when_none():
    s = new_session("u1")
    assert s["name"].startswith("Chat — ")


def test_new_session_auto_name_when_empty_string():
    s = new_session("u1", name="")
    assert s["name"].startswith("Chat — ")


# ---------------------------------------------------------------------------
# FEAT-004 — list_sessions_inmemory
# ---------------------------------------------------------------------------

def test_list_sessions_inmemory_returns_user_sessions():
    s1 = new_session("u1", name="Alpha")
    s2 = new_session("u1", name="Beta")
    s3 = new_session("u2", name="Other")
    for s in (s1, s2, s3):
        put_session_inmemory(s)

    result = list_sessions_inmemory("u1")
    ids = {r["id"] for r in result}
    assert s1["id"] in ids
    assert s2["id"] in ids
    assert s3["id"] not in ids


def test_list_sessions_inmemory_newest_first():
    import time
    s1 = new_session("u1", name="First")
    time.sleep(0.01)
    s2 = new_session("u1", name="Second")
    put_session_inmemory(s1)
    put_session_inmemory(s2)

    result = list_sessions_inmemory("u1")
    assert result[0]["name"] == "Second"
    assert result[1]["name"] == "First"


def test_list_sessions_inmemory_respects_limit():
    for i in range(10):
        s = new_session("u1", name=f"S{i}")
        put_session_inmemory(s)

    result = list_sessions_inmemory("u1", limit=3)
    assert len(result) == 3


def test_list_sessions_inmemory_no_turns_in_summary():
    s = new_session("u1", name="Check")
    append_turn(s, "user", "hello")
    put_session_inmemory(s)

    result = list_sessions_inmemory("u1")
    assert "turns" not in result[0]
    assert result[0]["turnCount"] == 1


def test_list_sessions_inmemory_empty_for_unknown_user():
    s = new_session("u1")
    put_session_inmemory(s)
    assert list_sessions_inmemory("u99") == []


# ---------------------------------------------------------------------------
# FEAT-004 — rename_session_inmemory
# ---------------------------------------------------------------------------

def test_rename_session_inmemory_updates_name():
    s = new_session("u1", name="Old name")
    put_session_inmemory(s)
    result = rename_session_inmemory(s["id"], "u1", "New name")
    assert result is True
    loaded = get_session_inmemory(s["id"], "u1")
    assert loaded["name"] == "New name"


def test_rename_session_inmemory_truncates_to_120():
    s = new_session("u1")
    put_session_inmemory(s)
    rename_session_inmemory(s["id"], "u1", "Y" * 200)
    loaded = get_session_inmemory(s["id"], "u1")
    assert len(loaded["name"]) == 120


def test_rename_session_inmemory_returns_false_wrong_user():
    s = new_session("u1")
    put_session_inmemory(s)
    result = rename_session_inmemory(s["id"], "u2", "Hack")
    assert result is False
    loaded = get_session_inmemory(s["id"], "u1")
    assert loaded["name"] != "Hack"


def test_rename_session_inmemory_returns_false_missing():
    assert rename_session_inmemory("no-such-id", "u1", "X") is False


# ---------------------------------------------------------------------------
# FEAT-004 — delete_session_inmemory
# ---------------------------------------------------------------------------

def test_delete_session_inmemory_removes_document():
    s = new_session("u1")
    put_session_inmemory(s)
    result = delete_session_inmemory(s["id"], "u1")
    assert result is True
    assert get_session_inmemory(s["id"], "u1") is None


def test_delete_session_inmemory_returns_false_wrong_user():
    s = new_session("u1")
    put_session_inmemory(s)
    result = delete_session_inmemory(s["id"], "u2")
    assert result is False
    assert get_session_inmemory(s["id"], "u1") is not None


def test_delete_session_inmemory_returns_false_missing():
    assert delete_session_inmemory("no-such-id", "u1") is False
