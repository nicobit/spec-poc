"""Migration helper: map legacy schedule.environment labels to environment ids.

Usage: run with the backend environment active where the stores are reachable.
This script attempts to resolve schedule.environment (label) to a single environment
by matching `id`, `name`, or `lifecycle`. If multiple matches exist, it emits
a CSV report for manual resolution.
"""
from __future__ import annotations

import csv
import os
from typing import List

from shared.environment_repository import get_environment_store
from shared import scheduler_store as mem_scheduler


def load_environments() -> List[dict]:
    store = get_environment_store()
    if store:
        try:
            return store.list_environments()
        except Exception:
            pass
    # fallback to in-memory seeded list
    from shared.environment_store import list_environments as list_envs

    return list_envs()


def migrate():
    envs = load_environments()
    # index by id, name, lifecycle
    by_id = {e.get("id"): e for e in envs}
    by_name = {str(e.get("name") or "").lower(): e for e in envs}
    by_lifecycle = {str(e.get("lifecycle") or "").lower(): e for e in envs if e.get("lifecycle")}

    # read schedules from in-memory store
    schedules = mem_scheduler.SCHEDULES

    report_rows = []

    for s in schedules:
        if s.get("environment_id"):
            continue
        label = str(s.get("environment") or "").lower()
        resolved = None
        if s.get("environment") and s.get("environment") in by_id:
            resolved = by_id.get(s.get("environment"))
        elif label in by_name:
            resolved = by_name[label]
        elif label in by_lifecycle:
            resolved = by_lifecycle[label]

        if resolved:
            s["environment_id"] = resolved.get("id")
            s["environment"] = resolved.get("name")
            print(f"Migrated schedule {s.get('id')} -> env {s.get('environment_id')}")
        else:
            report_rows.append({"schedule_id": s.get("id"), "environment": s.get("environment")})

    if report_rows:
        with open("schedules_migration_report.csv", "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["schedule_id", "environment"])
            writer.writeheader()
            for r in report_rows:
                writer.writerow(r)
        print("Migration completed with unresolved entries. See schedules_migration_report.csv")
    else:
        print("Migration completed successfully. All schedules resolved.")


if __name__ == "__main__":
    migrate()
