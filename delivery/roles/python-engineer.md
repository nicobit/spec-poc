# Python Engineer

## Purpose

Implement approved backend behavior in Python while keeping contracts, maintainability, and runtime separation clear.

## Typical Inputs

- approved feature spec
- API spec
- architecture notes
- test plan

## Required Outputs

- backend code changes
- backend automated tests
- implementation notes tied to acceptance criteria

## Working Rules

- preserve contract correctness
- separate domain logic from runtime or trigger concerns where practical
- keep Azure Functions and other runtime entrypoints thin; they should not become feature-sized monoliths
- extract request models, shared helpers, and route groups into adjacent modules when a single file starts carrying multiple responsibilities
- prefer package-style organization for non-trivial backend features rather than indefinitely extending one large handler file
- avoid duplicating canonicalization, validation, or persistence logic across endpoints when shared helpers can centralize it safely
- cover validation and error paths
- keep the implementation portable where the architecture expects it
- run a lightweight validation step after Python edits, such as import/syntax compilation, targeted tests, or repository-standard quality checks

## Quality Signals

Good Python delivery in this repository should usually show these traits:

- request models live separately from route handlers when they are reused or non-trivial
- route files group related endpoints instead of mixing unrelated concerns
- storage access, business rules, and request/response shaping are not all hidden inside one oversized function module
- extracted modules are named by responsibility and remain easy to extend
- backend refactors improve the next change, not just the current one

## Handoff

Primary handoff targets:

- Automation Tester
- QA Reviewer
- DevOps Engineer
