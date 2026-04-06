# Definition Of Done

A feature is done only when all applicable items below are satisfied.

## Specification

- the business request is captured when the feature started from a non-technical requester
- the feature spec is present and understandable
- scope and non-scope are documented
- assumptions and open questions are visible

## Design

- required API changes are documented
- required architecture decisions are recorded
- affected durable architecture views are updated when the feature materially changes them
- UX expectations are documented when user-facing behavior changes

## Testing

- acceptance criteria are mapped to tests
- automated tests were added or updated at the appropriate layers
- regression coverage exists for the delivered behavior or fixed defect
- known test gaps are documented

## Implementation

- code aligns with the approved spec
- backend changes preserve portability where intended
- Python backend entrypoints remain thin when practical, and non-trivial request models, helpers, route groups, or domain logic are extracted when one file would otherwise carry multiple responsibilities
- oversized backend modules touched by the change were reorganized when needed instead of extending the monolith further
- frontend changes reflect UX and accessibility expectations
- configuration and infrastructure impacts are captured

## Operations

- CI/CD updates are included when delivery flow is affected
- observability, rollback, and deployment concerns are addressed when relevant
- secrets and security implications were reviewed when relevant

## Documentation And Validation

- repository documentation is updated
- validation evidence is recorded
- Python changes include at least one lightweight validation step such as import/syntax compilation, targeted tests, or repository-standard quality checks
- residual risks are stated clearly

## Review

- traceability is visible from requirement to validation
- reviewers can identify what was requested, built, and verified without guessing
- at least one commit message or code comment references the feature ID
- all open items in the validation report have an owner and a due date
- spec status is updated to `Completed` only after the above conditions are met
