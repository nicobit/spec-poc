# Feature Specification

## Feature ID

- `FEAT-ADMIN-006`

## Feature Name

- `Environments Dashboard`

## Summary

Provide an operational dashboard under the Environments area that summarizes environment status, recent execution outcomes, incomplete configuration, and upcoming scheduled actions.

## Functional Requirements

### FR-1 Dashboard entry page

- The `/environment` route must behave as the Environments dashboard entry page.
- The page must present an operational overview rather than a placeholder summary card.

### FR-2 KPI summary

- The dashboard must show a KPI row with the most useful high-level environment counts.
- The first release must include:
  - total environments
  - total stages
  - running stages
  - scheduled actions

### FR-3 Attention visibility

- The dashboard must surface environments that need attention.
- The first release must include:
  - recent failed or partially failed executions
  - environments with incomplete stage resource configuration
  - environments without schedules

### FR-4 Upcoming scheduled actions

- The dashboard must show an upcoming scheduled actions panel.
- The first release must show a compact list of the nearest scheduled actions with:
  - environment
  - stage
  - action
  - timezone
  - next run

### FR-5 Recent execution outcomes

- The dashboard must show a recent execution outcomes panel.
- The first release must prioritize failed and partially failed executions ahead of successful runs.

### FR-6 Drill-through navigation

- The dashboard must provide direct navigation to:
  - environment details
  - manage environments
  - schedules
  - execution history when execution data is shown

## Non-Functional Requirements

### NFR-1 Readability

- The dashboard must remain scan-friendly at desktop and laptop widths.
- The page must emphasize operational signal over raw configuration detail.

### NFR-2 Progressive enhancement

- The first release may compose data from existing APIs.
- A dedicated dashboard backend contract is optional and not required for the first release.

### NFR-3 Theme compatibility

- The dashboard must follow the shared theme system and current shell/page conventions.

## Acceptance Criteria

1. The `/environment` page presents a real environments dashboard rather than a placeholder summary.
2. The dashboard shows useful KPI cards for environment and stage operational counts.
3. The dashboard highlights failed or partially failed executions and incomplete configuration.
4. The dashboard shows the next scheduled stage actions with readable timing information.
5. Users can drill into environment details, schedules, and execution history from the dashboard.
6. The dashboard remains consistent with existing environment management pages and theme styling.
