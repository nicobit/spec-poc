import json
import os
from copy import deepcopy
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

import backend.function_environment.__init__ as fe
from shared import scheduler_store as mem_store
from shared.environment_store import ENVIRONMENTS

client = TestClient(fe.fast_app)


@pytest.fixture(autouse=True)
def reset_schedule_and_environment_state():
    schedule_snapshot = deepcopy(mem_store.SCHEDULES)
    environment_snapshot = deepcopy(ENVIRONMENTS)
    yield
    mem_store.SCHEDULES.clear()
    mem_store.SCHEDULES.extend(schedule_snapshot)
    ENVIRONMENTS.clear()
    ENVIRONMENTS.extend(environment_snapshot)


def set_user(claims):
    fe.get_current_user = lambda req: claims


def test_create_schedule_in_memory(monkeypatch, tmp_path):
    # ensure no cosmos
    monkeypatch.delenv('COSMOS_CONNECTION_STRING', raising=False)
    # clear in-memory schedules
    mem_store.SCHEDULES.clear()
    set_user({"roles": ["admin"], "preferred_username": "system"})

    payload = {
        "environment_id": "env-1",
        "environment": "dev-1",
        "client": "client-a",
        "stage_id": "stage-dev-sql",
        "stage": "stage1",
        "action": "start",
        "cron": "*/5 * * * *",
        "timezone": "UTC",
    }
    r = client.post('/api/environments/schedules', json=payload)
    assert r.status_code == 200
    body = r.json()
    assert 'created' in body
    created = body['created']
    assert created['environment_id'] == 'env-1'
    assert created['stage_id'] == 'stage-dev-sql'
    assert created['action'] == 'start'
    assert 'id' in created
    assert 'next_run' in created


def test_list_schedules_in_memory(monkeypatch):
    monkeypatch.delenv('COSMOS_CONNECTION_STRING', raising=False)
    set_user({"roles": ["admin"], "preferred_username": "system"})
    # ensure there's at least one schedule
    if not mem_store.SCHEDULES:
        mem_store.SCHEDULES.append({
            'id': 'sched-test',
            'environment': 'dev-1',
            'environment_id': 'env-1',
            'client': 'client-a',
            'stage': 'stage1',
            'stage_id': 'stage-dev-sql',
            'action': 'start',
            'next_run': (datetime.now(timezone.utc) - timedelta(seconds=10)).isoformat(),
            'enabled': True,
        })
    r = client.get('/api/environments/schedules')
    assert r.status_code == 200
    body = r.json()
    assert 'schedules' in body


def test_timer_enqueues_due(monkeypatch, tmp_path):
    # call timer main directly
    from backend.function_scheduler_timer import __init__ as timer_mod
    # prepare a due schedule
    mem_store.SCHEDULES.clear()
    now = datetime.now(timezone.utc)
    mem_store.SCHEDULES.append({
        'id': 's1',
        'environment': 'dev-1',
        'environment_id': 'env-1',
        'client': 'client-a',
        'stage': 'stage1',
        'stage_id': 'stage-dev-sql',
        'action': 'start',
        'next_run': (now - timedelta(seconds=5)).isoformat(),
        'enabled': True,
    })

    # create a fake Out collector
    class DummyOut:
        def __init__(self):
            self.value = None
        def set(self, v):
            self.value = v

    out = DummyOut()
    timer_mod.main(mytimer=type('T', (), {'past_due': False}), outputQueueItem=out)
    assert out.value is not None
    messages = json.loads(out.value)
    assert isinstance(messages, list)
    assert messages[0]['environment'] == 'dev-1'
    assert messages[0]['client'] == 'client-a'


def test_create_schedule_prefers_canonical_environment_and_stage_ids(monkeypatch):
    monkeypatch.delenv("COSMOS_CONNECTION_STRING", raising=False)
    mem_store.SCHEDULES.clear()
    set_user({"roles": ["admin"], "preferred_username": "system"})

    ENVIRONMENTS[0]["name"] = "DEV-RENAMED"
    ENVIRONMENTS[0]["stages"][0]["name"] = "STG"

    response = client.post(
        "/api/environments/schedules",
        json={
            "environment_id": "env-1",
            "stage_id": "stage-dev-sql",
            "action": "start",
            "cron": "*/5 * * * *",
            "timezone": "UTC",
        },
    )

    assert response.status_code == 200
    created = response.json()["created"]
    assert created["environment_id"] == "env-1"
    assert created["environment"] == "DEV-RENAMED"
    assert created["stage_id"] == "stage-dev-sql"
    assert created["stage"] == "STG"
    assert created["client_id"] == "client-001"


def test_create_schedule_rejects_stage_id_outside_environment(monkeypatch):
    monkeypatch.delenv("COSMOS_CONNECTION_STRING", raising=False)
    mem_store.SCHEDULES.clear()
    set_user({"roles": ["admin"], "preferred_username": "system"})

    response = client.post(
        "/api/environments/schedules",
        json={
            "environment_id": "env-1",
            "stage_id": "stage-qa-live",
            "action": "start",
            "cron": "*/5 * * * *",
            "timezone": "UTC",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "stage_id not found for environment"


def test_postpone_schedule_allows_notification_recipient(monkeypatch):
    monkeypatch.delenv("COSMOS_CONNECTION_STRING", raising=False)
    mem_store.SCHEDULES.clear()
    set_user({"roles": ["admin"], "preferred_username": "system"})

    create_response = client.post(
        "/api/environments/schedules",
        json={
            "environment_id": "env-1",
            "stage_id": "stage-dev-sql",
            "action": "stop",
            "cron": "0 8 * * 1-5",
            "timezone": "UTC",
            "notification_groups": [
                {"id": "ng-ops", "name": "Ops", "recipients": ["ops@example.com"]}
            ],
            "postponement_policy": {"enabled": True, "maxPostponeMinutes": 60, "maxPostponements": 2},
        },
    )
    assert create_response.status_code == 200
    schedule_id = create_response.json()["created"]["id"]

    set_user({"roles": ["viewer"], "preferred_username": "ops@example.com"})
    postpone_response = client.post(
        f"/api/environments/schedules/{schedule_id}/postpone",
        json={"postponeByMinutes": 30, "reason": "Maintenance window"},
    )

    assert postpone_response.status_code == 200
    updated = postpone_response.json()["updated"]
    assert updated["postponement_count"] == 1
    assert updated["postponed_by"] == "ops@example.com"
    assert updated["postpone_reason"] == "Maintenance window"
    assert updated["postponed_until"]


def test_postpone_schedule_rejects_unrelated_user(monkeypatch):
    monkeypatch.delenv("COSMOS_CONNECTION_STRING", raising=False)
    mem_store.SCHEDULES.clear()
    set_user({"roles": ["admin"], "preferred_username": "system"})

    create_response = client.post(
        "/api/environments/schedules",
        json={
            "environment_id": "env-1",
            "stage_id": "stage-dev-sql",
            "action": "stop",
            "cron": "0 8 * * 1-5",
            "timezone": "UTC",
            "notification_groups": [
                {"id": "ng-ops", "name": "Ops", "recipients": ["ops@example.com"]}
            ],
            "postponement_policy": {"enabled": True, "maxPostponeMinutes": 60, "maxPostponements": 2},
        },
    )
    schedule_id = create_response.json()["created"]["id"]

    set_user({"roles": ["viewer"], "preferred_username": "other@example.com"})
    postpone_response = client.post(
        f"/api/environments/schedules/{schedule_id}/postpone",
        json={"postponeByMinutes": 30, "reason": "Not allowed"},
    )

    assert postpone_response.status_code == 403
    assert postpone_response.json()["detail"] == "Forbidden"


def test_postpone_schedule_rejects_when_request_exceeds_policy(monkeypatch):
    monkeypatch.delenv("COSMOS_CONNECTION_STRING", raising=False)
    mem_store.SCHEDULES.clear()
    set_user({"roles": ["admin"], "preferred_username": "system"})

    create_response = client.post(
        "/api/environments/schedules",
        json={
            "environment_id": "env-1",
            "stage_id": "stage-dev-sql",
            "action": "stop",
            "cron": "0 8 * * 1-5",
            "timezone": "UTC",
            "notification_groups": [
                {"id": "ng-ops", "name": "Ops", "recipients": ["ops@example.com"]}
            ],
            "postponement_policy": {"enabled": True, "maxPostponeMinutes": 15, "maxPostponements": 1},
        },
    )
    schedule_id = create_response.json()["created"]["id"]

    set_user({"roles": ["environment-manager"], "preferred_username": "manager@example.com"})
    postpone_response = client.post(
        f"/api/environments/schedules/{schedule_id}/postpone",
        json={"postponeByMinutes": 30, "reason": "Too long"},
    )

    assert postpone_response.status_code == 409
    assert postpone_response.json()["detail"] == "Requested postponement exceeds policy"

