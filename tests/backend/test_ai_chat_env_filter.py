import json
import sys
import uuid
from pathlib import Path
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

import backend.function_ai_chat.__init__ as ai_mod
from shared import scheduler_store as sched_store
from shared.client_store import CLIENTS
from shared.environment_store import ENVIRONMENTS
from shared.execution_store import STAGE_EXECUTIONS, upsert_stage_execution


def _make_msg(content: str, tool_calls=None):
    msg = MagicMock()
    msg.tool_calls = tool_calls or None
    msg.content = content
    return msg


def _build_execution(**overrides):
    payload = {
        "id": f"exec-{uuid.uuid4().hex[:8]}",
        "executionId": f"exec-{uuid.uuid4().hex[:8]}",
        "clientId": "client-001",
        "environmentId": "env-1",
        "stageId": "stage-dev-sql",
        "scheduleId": "sched-a",
        "action": "start",
        "source": "schedule",
        "requestedAt": "2026-03-29T12:00:00Z",
        "requestedBy": "test-admin",
        "status": "failed",
        "error": "Something went wrong",
    }
    payload.update(overrides)
    return payload


# ---------------------------------------------------------------------------
# Catalog builder tests
# ---------------------------------------------------------------------------

def test_catalog_includes_all_schedules():
    sched_store.SCHEDULES.clear()
    sched_store.SCHEDULES.extend([
        {"id": "sched-a", "environment": "DEV", "environment_id": "env-1", "client_id": "client-001", "stage_id": "s1", "next_run": "2026-04-03T12:00:00Z", "enabled": True},
        {"id": "sched-b", "environment": "QA", "environment_id": "env-2", "client_id": "client-002", "stage_id": "s2", "next_run": "2026-04-03T13:00:00Z", "enabled": False},
    ])

    catalog_str = ai_mod._build_catalog()
    catalog = json.loads(catalog_str)

    schedule_ids = [s["id"] for s in catalog["schedules"]]
    assert "sched-a" in schedule_ids
    assert "sched-b" in schedule_ids


def test_catalog_includes_all_clients():
    catalog_str = ai_mod._build_catalog()
    catalog = json.loads(catalog_str)

    client_ids = [c["id"] for c in catalog["clients"]]
    # seed clients from client_store are present
    assert len(catalog["clients"]) >= 1
    assert all("id" in c and "name" in c for c in catalog["clients"])


def test_catalog_includes_environments():
    catalog_str = ai_mod._build_catalog()
    catalog = json.loads(catalog_str)

    assert "environments" in catalog
    assert isinstance(catalog["environments"], list)


def test_catalog_does_not_require_filters():
    """Catalog is built without any filter input — core requirement."""
    catalog_str = ai_mod._build_catalog()
    catalog = json.loads(catalog_str)
    assert "clients" in catalog
    assert "schedules" in catalog
    assert "environments" in catalog


# ---------------------------------------------------------------------------
# Tool dispatch tests
# ---------------------------------------------------------------------------

def test_execute_tool_get_recent_executions():
    STAGE_EXECUTIONS.clear()
    upsert_stage_execution(_build_execution(scheduleId="sched-a", executionId="exec-10", status="failed"))

    result = json.loads(ai_mod._execute_tool("get_recent_executions", {"schedule_id": "sched-a", "limit": 5}))

    assert isinstance(result, list)
    assert result[0]["executionId"] == "exec-10"


def test_execute_tool_get_failure_summary():
    STAGE_EXECUTIONS.clear()
    upsert_stage_execution(_build_execution(scheduleId="sched-a", executionId="exec-f1", status="failed", requestedAt="2026-04-02T10:00:00Z"))
    upsert_stage_execution(_build_execution(scheduleId="sched-a", executionId="exec-f2", status="failed", requestedAt="2026-04-02T11:00:00Z"))

    result = json.loads(ai_mod._execute_tool("get_failure_summary", {"since_days": 30}))

    assert isinstance(result, list)
    entry = next((r for r in result if r["scheduleId"] == "sched-a"), None)
    assert entry is not None
    assert entry["failures"] == 2


def test_execute_tool_list_failed_executions():
    STAGE_EXECUTIONS.clear()
    upsert_stage_execution(_build_execution(scheduleId="sched-b", executionId="exec-b1", status="failed", requestedAt="2026-04-02T10:00:00Z"))
    upsert_stage_execution(_build_execution(scheduleId="sched-b", executionId="exec-b2", status="succeeded", requestedAt="2026-04-02T11:00:00Z"))

    result = json.loads(ai_mod._execute_tool("list_failed_executions", {"schedule_id": "sched-b", "since_days": 30}))

    assert isinstance(result, list)
    assert len(result) == 1
    assert result[0]["executionId"] == "exec-b1"


def test_execute_tool_unknown_returns_error():
    result = json.loads(ai_mod._execute_tool("nonexistent_tool", {}))
    assert "error" in result


# ---------------------------------------------------------------------------
# Endpoint with tool-calling loop test
# ---------------------------------------------------------------------------

def test_endpoint_tool_calling_loop(monkeypatch):
    """LLM emits a tool call on round 1; backend executes it and gets final answer on round 2."""
    STAGE_EXECUTIONS.clear()
    upsert_stage_execution(_build_execution(scheduleId="sched-a", executionId="exec-loop", status="failed", requestedAt="2026-04-02T10:00:00Z"))

    async def _fake_user(req):
        return {"roles": ["admin"]}

    monkeypatch.setattr(ai_mod, "get_current_user", _fake_user)

    # Round 1: LLM asks for failure summary
    tool_call = MagicMock()
    tool_call.id = "tc-1"
    tool_call.function.name = "get_failure_summary"
    tool_call.function.arguments = '{"since_days": 7}'

    first_msg = MagicMock()
    first_msg.tool_calls = [tool_call]
    first_msg.content = None

    # Round 2: LLM answers
    final_resp = json.dumps({"answer": "sched-a had 1 failure", "remediation": [], "references": []})
    second_msg = MagicMock()
    second_msg.tool_calls = None
    second_msg.content = final_resp

    call_count = [0]

    def fake_chat_with_tools(messages, tools, max_tokens=800, temperature=0):
        call_count[0] += 1
        if call_count[0] == 1:
            return first_msg
        return second_msg

    monkeypatch.setattr(ai_mod.OpenAIService, "chat_with_tools", staticmethod(fake_chat_with_tools))

    client = TestClient(ai_mod.fast_app)
    resp = client.post("/api/ai/chat", json={"message": "Which schedules are failing?"})

    assert resp.status_code == 200
    body = resp.json()
    assert "sched-a" in body.get("answer", "")
    assert call_count[0] == 2
