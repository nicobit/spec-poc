---
name: python-function-delivery
description: Implement approved backend behavior in Python while keeping runtime adapters thin, preserving contracts, and aligning changes with specs and tests.
---

# Python Function Delivery

## Use For

- implementing approved backend behavior in Python
- keeping Azure Functions adapters thin where practical
- reorganizing oversized Python backend modules into clearer packages, route groups, models, and shared helpers when the current structure is carrying too many responsibilities

## Read First

- `delivery/roles/python-engineer.md`
- `docs/standards/engineering/engineering-standards.md`
- `docs/architecture/backend-migration-plan.md`
- `docs/standards/engineering/testing-strategy.md`

## Outputs

- backend implementation
- validation and error-path handling
- updated backend tests
- notes on shared vs runtime-specific logic
- lightweight validation evidence such as `py_compile`, targeted tests, or repository-standard quality checks

## Delivery Expectations

- keep runtime entrypoints thin and composition-focused
- move reused request models, canonicalization helpers, and route groups out of giant handler files when that improves maintainability
- do not keep extending a monolithic Python module once the touched area is already hard to reason about
- prefer adjacent feature-local modules over scattering backend logic across unrelated folders


