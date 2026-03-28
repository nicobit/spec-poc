# Project Constitution

This constitution defines the non-negotiable governing principles for all work in this repository.

Every specification, architecture decision, and implementation must respect these articles. If a proposed design conflicts with an article, the conflict must be surfaced explicitly and resolved before implementation proceeds — not silently worked around.

## Article I — Spec Before Code

No implementation work begins without a governing specification. The specification defines what is to be built and why. Code is an expression of the specification, not the source of truth.

## Article II — Traceability Is Not Optional

Every requirement maps to at least one acceptance criterion. Every acceptance criterion maps to at least one test. Every delivered feature has implementation evidence and validation evidence. Traceability gaps are defects, not oversights.

## Article III — Tests Derive From Acceptance Criteria

Test scenarios are derived from acceptance criteria before implementation starts. Tests are not written to describe what the code does — they are written to verify what the specification requires.

## Article IV — Auth By Default

All routes and endpoints require authentication unless explicitly listed as public exceptions in the authorization documentation. The only standing public exception is `GET /health/healthz`. Any new public exception must be reviewed and documented before it is implemented.

## Article V — Hosting-Agnostic Business Logic

Business logic lives in shared modules, not in hosting wrappers. Azure Functions, containers, and other runtime layers are thin triggers. A spec that is correct today must remain correct if the hosting model changes tomorrow.

## Article VI — Lazy Initialization

Secrets, credentials, and external network connections are never resolved at import time or module load time. Initialization is deferred to first use. This keeps tests fast, deployments safe, and cold starts predictable.

## Article VII — Portable Specifications

Specifications describe behavior and outcomes, not implementation technology. A feature spec written today must remain valid if the frontend framework, backend runtime, or cloud provider changes. Technology choices belong in ADRs and implementation plans, not in feature specs.

## Article VIII — Integration Over Mocks At System Boundaries

Tests that verify behavior crossing a system boundary use realistic environments. Mocking at system boundaries hides contract failures. Unit mocks are acceptable for internal logic isolation; they are not acceptable as substitutes for integration verification.

## Article IX — Minimum Correct Surface Area

Every change targets the smallest correct surface area. Features are not extended beyond their approved scope. Refactoring, cleanup, and improvements beyond what the spec requires are separate requests with their own specs.

## Conflict Resolution

When a proposed design conflicts with an article:

1. Surface the conflict explicitly in the spec refinement or ADR.
2. Propose an exception with a documented rationale.
3. Get explicit approval before proceeding.

Silently ignoring an article is not permitted. Temporary exceptions must be time-bounded and tracked as open items.
