# Task Breakdown — Environments Dashboard

## Feature ID

`FEAT-ENVIRONMENTS-002`

## Absorbed Enhancements

- Postponed schedules visibility on the environments dashboard is governed here rather than in a separate enhancement-only package.

## Tasks

### 1. Specification and Design
- Create/approve `feature-spec.md`, `business-request.md`, `spec-refinement.md`. *(done)*
- Define KPI metrics, attention criteria, and panel layout in spec. *(done)*

### 2. Frontend — Dashboard Shell
- Replace placeholder `/environment` route content with a dashboard layout component.
- Implement KPI summary row (total environments, total stages, running stages, scheduled actions).

### 3. Frontend — Attention Panel
- List environments with recent failed or partially failed executions.
- List environments with incomplete stage resource configuration.
- List environments without any schedules.

### 4. Frontend — Upcoming Scheduled Actions Panel
- Fetch and sort upcoming scheduled actions by next run time.
- Render compact list: environment, stage, action, timezone, next run.

### 5. Frontend — Recent Execution Outcomes Panel
- Fetch recent executions and sort: failed and partially failed first, then successful.
- Render outcome cards with drill-through links to execution history.

### 6. Navigation and Drill-Through
- Wire all dashboard items to existing environment details, manage, schedules, and history routes.

### 7. Tests
- Add unit tests for each panel (KPI, attention, upcoming, recent executions).
- Add route-level integration test.
- Add empty-state coverage.

### 8. Validation and Documentation
- Update `validation-report.md` after implementation.
- Update `docs/standards/frontend/ui-standards.md` if new shared dashboard patterns are introduced.

## Owners

- Frontend: `@frontend-owner`
- Review: `@ux-expert`

## Status

- Specification complete.
- Implementation not yet started.
