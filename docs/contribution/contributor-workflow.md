# Contributor Workflow

Use this as the contributor entrypoint for any meaningful change in the repository.

The canonical delivery logic lives in:

- `delivery/workflows/spec-driven-delivery.md`
- `delivery/workflows/business-to-spec-workflow.md`
- `delivery/governance/traceability.md`
- `delivery/governance/definition-of-done.md`

## Start Condition

Every change should start from one of these:

- a business request
- a bug report
- an architectural improvement
- an operational or CI/CD improvement

## Contributor Sequence

1. Create or identify the feature package.
2. Capture the source request.
3. Refine the request into a feature spec.
4. Add supporting artifacts if needed:
   - API spec
   - ADR
   - UX notes
   - test plan
5. Implement code and tests.
6. Update docs and validation report.
7. Review against the definition of done.

Use the delivery workflow documents above as the source of truth when more detail is needed. This page is intentionally shorter and contributor-oriented.

## Feature Package Convention

Store feature-level artifacts under:

`specs/features/<feature-id>-<short-name>/`

Recommended contents:

- `business-request.md`
- `spec-refinement.md`
- `feature-spec.md`
- `api-spec.md` when relevant
- `adr.md` when relevant
- `test-plan.md`
- `task-breakdown.md`
- `business-approval-summary.md` when the request is business-originated
- `validation-report.md`

Not every file is mandatory for every feature, but the absence should be intentional.

## Naming Convention

Examples:

- `specs/features/FEAT-ADMIN-001-user-directory/`
- `specs/features/FEAT-OPS-003-health-dashboard/`

## Pull Request Expectations

A pull request should summarize:

- the source request or feature id
- the affected specs
- the affected code areas
- the tests added or updated
- the validation status
- open risks or gaps

## Review Reminder

Review the change against:

- `delivery/governance/traceability.md`
- `docs/standards/engineering/engineering-standards.md`
- `delivery/governance/definition-of-done.md`


