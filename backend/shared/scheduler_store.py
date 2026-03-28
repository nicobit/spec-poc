from datetime import datetime, timedelta, timezone
from typing import List, Dict
from .schedule_model import Schedule

# In-memory schedule store for scaffolding and tests. Replace with DB in production.
SCHEDULES: List[Dict] = [
    {
        "id": "sched-1",
        "environment": "DEV",
        "client": "client-a",
        "stage": "stage1",
        "action": "start",
        "cron": None,
        "timezone": "UTC",
        "next_run": (datetime.utcnow() - timedelta(seconds=30)).isoformat(),
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
    now = now or datetime.utcnow()
    due = []
    for s in SCHEDULES:
        try:
            nr = datetime.fromisoformat(s.get("next_run"))
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
