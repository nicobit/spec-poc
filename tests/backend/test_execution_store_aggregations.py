"""Tests for execution_store aggregation helpers: get_failure_summary and list_failed_executions."""

import sys
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from shared.execution_store import (
    STAGE_EXECUTIONS,
    get_failure_summary,
    list_failed_executions,
    upsert_stage_execution,
)


def _make_execution(**overrides):
    base = {
        "id": f"exec-{uuid.uuid4().hex[:8]}",
        "executionId": f"exec-{uuid.uuid4().hex[:8]}",
        "clientId": "client-001",
        "environmentId": "env-1",
        "stageId": "stage-dev-sql",
        "scheduleId": "sched-a",
        "action": "start",
        "source": "schedule",
        "requestedAt": datetime.now(timezone.utc).isoformat(),
        "requestedBy": "test-admin",
        "status": "failed",
        "error": "Something went wrong",
    }
    base.update(overrides)
    return base


def _ts(days_ago: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat()


@pytest.fixture(autouse=True)
def clear_store():
    STAGE_EXECUTIONS.clear()
    yield
    STAGE_EXECUTIONS.clear()


# ---------------------------------------------------------------------------
# get_failure_summary
# ---------------------------------------------------------------------------

def test_get_failure_summary_counts_failures():
    upsert_stage_execution(_make_execution(scheduleId="sched-a", executionId="e1", requestedAt=_ts(1)))
    upsert_stage_execution(_make_execution(scheduleId="sched-a", executionId="e2", requestedAt=_ts(2)))
    upsert_stage_execution(_make_execution(scheduleId="sched-b", executionId="e3", requestedAt=_ts(1)))

    summary = get_failure_summary(since_days=7)

    sched_a = next((r for r in summary if r["scheduleId"] == "sched-a"), None)
    sched_b = next((r for r in summary if r["scheduleId"] == "sched-b"), None)

    assert sched_a is not None and sched_a["failures"] == 2
    assert sched_b is not None and sched_b["failures"] == 1


def test_get_failure_summary_excludes_old_entries():
    upsert_stage_execution(_make_execution(scheduleId="sched-old", executionId="e-old", requestedAt=_ts(30)))
    upsert_stage_execution(_make_execution(scheduleId="sched-new", executionId="e-new", requestedAt=_ts(1)))

    summary = get_failure_summary(since_days=7)

    ids = [r["scheduleId"] for r in summary]
    assert "sched-new" in ids
    assert "sched-old" not in ids


def test_get_failure_summary_ignores_succeeded():
    upsert_stage_execution(_make_execution(scheduleId="sched-ok", executionId="e-ok", status="succeeded", requestedAt=_ts(1)))

    summary = get_failure_summary(since_days=7)

    assert not any(r["scheduleId"] == "sched-ok" for r in summary)


def test_get_failure_summary_ignores_partially_failed():
    """partially_failed is not counted as a failure by the summary function."""
    upsert_stage_execution(_make_execution(scheduleId="sched-partial", executionId="e-partial", status="partially_failed", requestedAt=_ts(1)))

    summary = get_failure_summary(since_days=7)

    assert not any(r["scheduleId"] == "sched-partial" for r in summary)


def test_get_failure_summary_sorted_descending_by_failures():
    for i in range(3):
        upsert_stage_execution(_make_execution(scheduleId="sched-a", executionId=f"ea-{i}", requestedAt=_ts(1)))
    upsert_stage_execution(_make_execution(scheduleId="sched-b", executionId="eb-1", requestedAt=_ts(1)))

    summary = get_failure_summary(since_days=7)

    assert len(summary) >= 2
    assert summary[0]["failures"] >= summary[1]["failures"]


def test_get_failure_summary_returns_empty_when_no_failures():
    upsert_stage_execution(_make_execution(scheduleId="sched-x", executionId="ex-1", status="succeeded", requestedAt=_ts(1)))

    assert get_failure_summary(since_days=7) == []


def test_get_failure_summary_tracks_last_failure_timestamp():
    upsert_stage_execution(_make_execution(scheduleId="sched-a", executionId="e1", requestedAt=_ts(3)))
    upsert_stage_execution(_make_execution(scheduleId="sched-a", executionId="e2", requestedAt=_ts(1)))

    summary = get_failure_summary(since_days=7)
    entry = next(r for r in summary if r["scheduleId"] == "sched-a")

    # last_failure should be the most recent timestamp
    assert entry["last_failure"] is not None
    assert _ts(1)[:10] in entry["last_failure"] or entry["last_failure"] > _ts(3)


# ---------------------------------------------------------------------------
# list_failed_executions
# ---------------------------------------------------------------------------

def test_list_failed_executions_returns_only_failed():
    upsert_stage_execution(_make_execution(scheduleId="sched-a", executionId="fail-1", status="failed", requestedAt=_ts(1)))
    upsert_stage_execution(_make_execution(scheduleId="sched-a", executionId="ok-1", status="succeeded", requestedAt=_ts(1)))

    results = list_failed_executions(since_days=7)

    assert len(results) == 1
    assert results[0]["executionId"] == "fail-1"


def test_list_failed_executions_filters_by_schedule_id():
    upsert_stage_execution(_make_execution(scheduleId="sched-a", executionId="fa-1", requestedAt=_ts(1)))
    upsert_stage_execution(_make_execution(scheduleId="sched-b", executionId="fb-1", requestedAt=_ts(1)))

    results = list_failed_executions(since_days=7, schedule_id="sched-b")

    assert len(results) == 1
    assert results[0]["executionId"] == "fb-1"


def test_list_failed_executions_excludes_old_entries():
    upsert_stage_execution(_make_execution(scheduleId="sched-a", executionId="old-1", requestedAt=_ts(30)))
    upsert_stage_execution(_make_execution(scheduleId="sched-a", executionId="new-1", requestedAt=_ts(1)))

    results = list_failed_executions(since_days=7)

    exec_ids = [r["executionId"] for r in results]
    assert "new-1" in exec_ids
    assert "old-1" not in exec_ids


def test_list_failed_executions_respects_limit():
    for i in range(10):
        upsert_stage_execution(_make_execution(scheduleId="sched-a", executionId=f"ex-{i}", requestedAt=_ts(1)))

    results = list_failed_executions(since_days=7, limit=3)

    assert len(results) <= 3


def test_list_failed_executions_no_schedule_filter_returns_all():
    upsert_stage_execution(_make_execution(scheduleId="sched-a", executionId="fa-x", requestedAt=_ts(1)))
    upsert_stage_execution(_make_execution(scheduleId="sched-b", executionId="fb-x", requestedAt=_ts(1)))

    results = list_failed_executions(since_days=7)

    exec_ids = [r["executionId"] for r in results]
    assert "fa-x" in exec_ids
    assert "fb-x" in exec_ids


def test_list_failed_executions_sorted_most_recent_first():
    upsert_stage_execution(_make_execution(scheduleId="sched-a", executionId="older", requestedAt=_ts(3)))
    upsert_stage_execution(_make_execution(scheduleId="sched-a", executionId="newer", requestedAt=_ts(1)))

    results = list_failed_executions(since_days=7)

    assert results[0]["executionId"] == "newer"
