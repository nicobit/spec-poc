# Task Breakdown Template

## Metadata

- Related feature:
- Date:
- Owner:

## Parallelization Key

- `[P]` — task is independent and can run in parallel with other `[P]` tasks in the same phase
- _(no marker)_ — task must run sequentially, after its listed dependency completes

## Delivery Tasks

| Task ID | Description | Role | Inputs | Outputs | Dependency | Parallel |
| --- | --- | --- | --- | --- | --- | --- |
| `TASK-...` | | | | | | `[P]` or — |

## Suggested Sequencing

1. Specification and review
2. Design artifacts (ADR, API spec, UX notes — `[P]` where independent)
3. Research (if required — `[P]` with design artifacts)
4. Test design
5. Implementation (`[P]` tasks across frontend and backend where contracts are stable)
6. Validation and docs

## Notes

- Keep each task linked to feature and acceptance criterion identifiers where possible.
- Mark a task `[P]` only when it has no runtime dependency on another in-progress task.
- Frontend and backend implementation tasks are typically `[P]` once the API contract is agreed.
- Research tasks are typically `[P]` with architecture tasks when they investigate different concerns.
