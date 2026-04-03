# Example: New Feature

## Request

Create a feature for importing clients from CSV.

## Expected Path

- classify as a new feature
- create a new governing package under `specs/features/FEAT-<AREA>-<ID>-<short-name>/`
- start with:
  - `business-request.md`
  - `spec-refinement.md`
  - `feature-spec.md`
- add `api-spec.md` or `test-plan.md` only if the change warrants them
- do not implement code yet unless the request explicitly asks to proceed

## Why

This is a genuinely new user-facing capability, so it should not be squeezed into an unrelated existing package.
