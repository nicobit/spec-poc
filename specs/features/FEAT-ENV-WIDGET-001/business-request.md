# Business Request — Environment Status Widget

- Requestor: Product / Dashboard Team
- Date: 2026-04-06

## Summary

Add a dashboard widget that lets users track the status of one or more environments they care about. The widget should show a compact list of chosen environments with quick status indicators and basic health metadata.

## Motivation

Operators and developers need a lightweight way to monitor a handful of environments (dev/test/stage/prod slices) without navigating to each environment page. A favorites-style widget reduces context switching and speeds troubleshooting.

## Desired behavior

- Users can add multiple environments to the widget (a favorites list).
- The widget displays each environment's current `status` (Up/Down/Degraded), `lastChecked` timestamp, optional health metrics (CPU, error-rate), and owner/team.
- Users can remove environments from the widget and reorder them.
- Basic error and loading states must be shown.

## Success metrics

- 80% of users find it faster to check environment health vs. navigating to individual pages (measured in follow-up survey).
- Widget load time under 1s for cached data and <3s for first fetch on typical dev machine.

## Non-goals

- Full-blown monitoring dashboard or historical charts (out of scope for MVP).
