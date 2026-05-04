---
name: migration-review
description: Use this skill when reviewing EF Core or other persistence changes for compatibility, rollout safety, rollback concerns, and data integrity impact.
---

# Migration Review

Use this skill when the user asks things like:

- "Review this EF Core migration"
- "Is this schema change safe?"
- "What can go wrong with this database change?"

## Workflow

1. Identify the current persisted shape and proposed change.
2. Check for compatibility risks with existing data and existing application versions.
3. Check migration ordering, rollout, rollback, and operational risk.
4. Identify missing validation or data backfill needs.
5. Recommend tests, docs, and release notes if needed.

## Guardrails

- Do not assume schema changes are safe because they compile.
- Call out irreversible or operationally risky changes explicitly.
- Separate confirmed risks from assumptions.
