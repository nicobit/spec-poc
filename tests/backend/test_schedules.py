import json
import os
from datetime import datetime, timedelta

from fastapi.testclient import TestClient

from backend.function_environment.__init__ import fast_app
from shared import scheduler_store as mem_store

client = TestClient(fast_app)


def test_create_schedule_in_memory(monkeypatch, tmp_path):
    # ensure no cosmos
    monkeypatch.delenv('COSMOS_CONNECTION_STRING', raising=False)
    # clear in-memory schedules
    mem_store.SCHEDULES.clear()

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
    assert created['target'] == 'env-test'
    assert created['action'] == 'start'
    assert 'id' in created
    assert 'next_run' in created


def test_list_schedules_in_memory(monkeypatch):
    monkeypatch.delenv('COSMOS_CONNECTION_STRING', raising=False)
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
            'next_run': (datetime.utcnow() - timedelta(seconds=10)).isoformat(),
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
    now = datetime.utcnow()
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

