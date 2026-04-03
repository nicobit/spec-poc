# 2026-04-03 — Show postponed schedules on Environments Dashboard

Summary
-------

The Environments Dashboard now includes a "Postponed schedules" subsection that lists schedules manually postponed via the UI or API. Each entry shows the environment, stage, action, postponed-until timestamp, who postponed it, and an optional reason.

Why
---

Operators previously had to inspect schedules or execution logs to discover deferred automation. This change improves visibility and reduces the risk of missed automation windows.

Details
-------

- UI: `frontend/src/features/environment/components/EnvironmentDashboard.tsx` — adds a memoized `postponedSchedules` view and renders a new subsection under "Upcoming scheduled actions".
- Spec: `specs/features/FEAT-ENVIRONMENTS-002-dashboard/feature-spec.md`
- Backend: no API changes — the existing schedules list returns `postponed_until`, `postponed_by`, and `postpone_reason`.

Risk
----

Low — UI-only change that surfaces fields already present in the schedules API.

Related
-------

- Feature spec: `specs/features/FEAT-ENVIRONMENTS-002-dashboard/feature-spec.md`
- Tests: unit test added at `frontend/src/features/environment/components/EnvironmentDashboard.test.tsx`.
