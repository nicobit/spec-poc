from datetime import datetime, timedelta, timezone
from typing import List, Dict
from .schedule_model import Schedule


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)

# In-memory schedule store for scaffolding and tests. Replace with DB in production.
SCHEDULES: List[Dict] = [
    {
        "id": "sched-1",
        "environment": "DEV",
        "environment_id": "env-1",
        "client": "Client 001",
        "client_id": "client-001",
        "stage": "stage1",
        "stage_id": "stage-dev-sql",
        "action": "start",
        "cron": None,
        "timezone": "UTC",
        "next_run": (_utc_now() - timedelta(seconds=30)).isoformat(),
        "enabled": True,
        "owner": "system",
        "notify_before_minutes": 30,
        "notification_groups": [
            {"id": "ng-qa", "name": "QA Team", "recipients": ["qa.team@example.com"]}
        ],
        "postponement_policy": {"enabled": True, "maxPostponeMinutes": 120, "maxPostponements": 2},
        "postponement_count": 0,
    }
]


def get_due_schedules(now: datetime = None):
    now = now or _utc_now()
    due = []
    for s in SCHEDULES:
        try:
            nr = datetime.fromisoformat(s.get("next_run"))
            if nr.tzinfo is None:
                nr = nr.replace(tzinfo=timezone.utc)
        except Exception:
            continue
        if s.get("enabled") and nr <= now:
            due.append(s)
    return due


def mark_schedule_next_run(schedule_id: str, next_run: datetime):
    for s in SCHEDULES:
        if s.get("id") == schedule_id:
            s["next_run"] = next_run.isoformat()
            return s
    return None


def update_schedule(schedule_id: str, updater):
    for idx, schedule in enumerate(SCHEDULES):
        if schedule.get("id") == schedule_id:
            updated = updater(dict(schedule))
            SCHEDULES[idx] = updated
            return updated
    return None
