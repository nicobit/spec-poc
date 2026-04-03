# Test Plan — Environments Dashboard

## Feature ID

`FEAT-ENVIRONMENTS-002`

## Scope

Covers the operational environments dashboard at `/environment`: KPI summary row, attention panels, upcoming scheduled actions, recent execution outcomes, and drill-through navigation.

## Acceptance Criteria Coverage

| AC | Description | Test Type | Test Location |
|---|---|---|---|
| AC-1 | `/environment` shows a real dashboard rather than a placeholder | Frontend unit | `frontend/src/features/environments/` |
| AC-2 | KPI row shows correct environment/stage counts | Frontend unit | `EnvironmentsDashboard.test.tsx` |
| AC-3 | Attention panel shows environments with failed executions and incomplete config | Frontend unit | `EnvironmentsDashboard.test.tsx` |
| AC-4 | Upcoming scheduled actions panel renders schedule data | Frontend unit | `EnvironmentsDashboard.test.tsx` |
| AC-5 | Postponed schedules subsection renders postponed schedule metadata | Frontend unit | `EnvironmentsDashboard.test.tsx` |
| AC-6 | Recent execution outcomes prioritizes failed runs | Frontend unit | `EnvironmentsDashboard.test.tsx` |
| AC-7 | Drill-through links route to environment details, schedules, and history | Frontend unit / integration | routing test |

## Unit Tests

- Dashboard renders KPI counts from mock environment and execution data.
- Attention panel renders environments with `incomplete_config: true` and recent failures.
- Upcoming actions panel renders the nearest N scheduled actions in chronological order.
- Postponed schedules subsection renders postponed entries ordered by nearest `postponed_until`.
- Recent executions panel renders failed runs ahead of successful ones.
- Empty state renders correctly when no environments, no schedules, or no executions are present.
- Drill-through links resolve to the expected routes.

## Integration Tests

- Dashboard composes data from `/api/environments`, `/api/schedules`, and `/api/environments/{id}/executions` correctly when mocked at the network layer.
- Authentication guard prevents unauthenticated access to the dashboard route.

## End-to-End Tests

- Smoke test: load the dashboard with a seeded environment estate and assert all four panels are visible and non-empty.

## Out of Scope for First Release

- Performance / load testing of dashboard data composition.
- Visual regression testing (deferred).
- Mobile viewport testing (deferred; desktop-first per NFR-1).
