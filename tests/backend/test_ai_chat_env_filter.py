import uuid

import backend.function_ai_chat.__init__ as ai_mod
from shared import scheduler_store as sched_store
from shared.execution_store import STAGE_EXECUTIONS, upsert_stage_execution
from shared.environment_store import ENVIRONMENTS


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


def test_filter_by_environment_id(monkeypatch):
    # prepare schedules and executions
    STAGE_EXECUTIONS.clear()
    sched_store.SCHEDULES.clear()
    sched_store.SCHEDULES.extend([
        {"id": "sched-a", "environment": "DEV", "environment_id": "env-1", "client_id": "client-001", "stage_id": "stage-dev-sql", "next_run": "2026-04-03T12:00:00Z", "enabled": True},
        {"id": "sched-b", "environment": "QA", "environment_id": "env-2", "client_id": "client-002", "stage_id": "stage-qa-live", "next_run": "2026-04-03T13:00:00Z", "enabled": True},
    ])

    exec1 = upsert_stage_execution(_build_execution(scheduleId="sched-a", executionId="exec-1"))

    result = ai_mod._build_result_data("What's up?", {"environmentId": "env-1"})
    assert "Environment filter applied:" in result
    assert "sched-a" in result
    assert "exec-1" in result


def test_schedule_and_environment_mismatch(monkeypatch):
    STAGE_EXECUTIONS.clear()
    sched_store.SCHEDULES.clear()
    sched_store.SCHEDULES.append({"id": "sched-a", "environment": "DEV", "environment_id": "env-1", "client_id": "client-001", "stage_id": "stage-dev-sql", "next_run": "2026-04-03T12:00:00Z", "enabled": True})

    upsert_stage_execution(_build_execution(scheduleId="sched-a", executionId="exec-2"))

    # request schedule sched-a but filter for a different environment env-2
    result = ai_mod._build_result_data("Give me details", {"scheduleId": "sched-a", "environmentId": "env-2"})
    assert "does not match requested environment" in result
    # should not include execution details from other environment
    assert "exec-2" not in result


def test_filter_by_environment_name(monkeypatch):
    STAGE_EXECUTIONS.clear()
    sched_store.SCHEDULES.clear()
    # environment name 'dev-1' exists in ENVIRONMENTS (env-1)
    sched_store.SCHEDULES.append({"id": "sched-a", "environment": "DEV", "environment_id": "env-1", "client_id": "client-001", "stage_id": "stage-dev-sql", "next_run": "2026-04-03T12:00:00Z", "enabled": True})
    upsert_stage_execution(_build_execution(scheduleId="sched-a", executionId="exec-3"))

    result = ai_mod._build_result_data("Status?", {"environmentName": "dev-1"})
    assert "Environment filter applied:" in result
    assert "dev-1" in result
    assert "exec-3" in result
