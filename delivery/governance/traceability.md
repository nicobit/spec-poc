# Traceability Standard

Traceability is mandatory for this repository.

## Why

The purpose of this repo is to demonstrate that implementation can be systematically derived from specifications. Traceability is the proof.

## Required Links

Each significant feature should have links between:

- business need
- feature specification
- acceptance criteria
- API contract changes
- architecture decisions
- architecture view updates when relevant
- implementation tasks
- code changes
- automated tests
- validation report
- documentation updates
- authorization documentation updates when access behavior changes

## Identifier Scheme

Use stable identifiers inside specs and tests.

Examples:

- Feature: `FEAT-USER-001`
- Requirement: `REQ-USER-001`
- Acceptance criterion: `AC-USER-001`
- API endpoint: `API-USER-001`
- Test case: `TC-USER-001`
- ADR: `ADR-001`

Identifiers should be referenced in:

- markdown artifacts
- test names where practical
- pull requests
- validation reports

## Minimum Traceability Rules

- Every requirement should map to at least one acceptance criterion.
- Every acceptance criterion should map to at least one test case.
- Every delivered feature should have implementation evidence and validation evidence.
- If code behavior changes, the affected spec and docs must be reviewed in the same change.
- If route protection, roles, or permissions change, the affected authorization docs must be reviewed in the same change.

## Lightweight Traceability Pattern

At a minimum, each feature should include a small matrix:

| Requirement | Acceptance Criteria | Tests | Notes |
| --- | --- | --- | --- |
| `REQ-...` | `AC-...` | `TC-...` | optional |

## Review Rule

Reviewers should reject a change if:

- the implementation cannot be traced back to a requirement
- acceptance criteria are not testable
- tests exist but are not linked to the changed behavior
