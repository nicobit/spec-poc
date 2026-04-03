# Spec Refinement

## Problem Statement

The current environments landing page does not yet behave like an operational dashboard. Users need a concise, scan-friendly surface that answers:

- what exists
- what is healthy
- what failed recently
- what is scheduled next
- where to click for action

## Product Direction

The environments dashboard should be an operational entry point under `/environment`, distinct from:

- `Manage environments`
- `Environment details`
- `Environment schedules`
- `Execution history`

It should summarize and prioritize, not replace those workflows.

## Users

- `Admin`
- `EnvironmentManager`
- `ClientAdmin` for environments belonging to the client scope they manage

## Dashboard Priorities

### 1. Overview metrics

Provide immediately readable high-level counts:

- total environments
- total stages
- running stages
- stopped stages
- scheduled actions
- environments needing attention

### 2. Attention-first panels

Highlight the operational items that matter most:

- latest failed or partially failed executions
- environments with incomplete stage/resource configuration
- environments without schedules

### 3. Upcoming activity

Show the next scheduled actions in a near-term time window, initially:

- next 5 to 10 scheduled actions
- action
- environment
- stage
- timezone and next run

### 4. Recent operations

Show recent execution outcomes to support quick drilling into problems.

## UX Shape

Recommended section order:

1. Header with title, description, and quick actions
2. KPI summary row
3. Attention section
4. Upcoming scheduled actions
5. Recent execution outcomes
6. Quick links to manage/details/schedules when useful

The dashboard should not duplicate the full management list.

## Data Sources

The first release should assemble the dashboard from existing environment and schedule APIs, plus execution/activity information already exposed in environment details.

No new backend contract is required for the first slice if the frontend can compose a useful dashboard from existing endpoints.

## Open Questions

- Should the first release include client-level grouping on the dashboard itself, or keep client visible only as metadata?
- Should recent failed executions use execution history only, or also show generic activity entries when execution data is absent?

## Decisions

- First release focuses on operational visibility, not executive reporting.
- The dashboard remains environment-scoped as a top-level environment area entry page.
- The first implementation may compose data in the frontend from existing contracts.
