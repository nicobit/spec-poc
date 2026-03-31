# Business Request

## Feature

- Feature ID: `FEAT-ADMIN-006`
- Feature Name: `Environments Dashboard`

## Request

Provide a dedicated operational dashboard for environments so users can quickly understand:

- how many environments and stages exist
- what is currently running or stopped
- what needs attention
- what scheduled actions are coming soon
- where recent failures happened

The dashboard should prioritize operational visibility and next actions instead of deep configuration editing.

## Business Outcome

- Reduce time to understand the current environment estate
- Make failures and incomplete configuration visible without opening each environment
- Surface upcoming scheduled actions so operators know what is about to happen
- Provide fast navigation to environment details, schedules, and execution history

## Initial Scope

- Environment operational summary cards
- Attention-focused panels
- Upcoming scheduled actions
- Recent failed or partially failed executions
- Incomplete configuration visibility
- Fast links into existing environment workflows

## Out of Scope

- New orchestration logic
- Deep execution troubleshooting workflows beyond links to existing pages
- Executive BI-style reporting
- Cross-domain analytics with costs, incidents, or problems
