<!--
Spec-first rule:
- Do not start feature implementation without a feature package under specs/features/.
- If the request is underspecified, update business-request/spec-refinement/feature-spec first.
- Every code-change merge request must point to the spec and test plan it implements.
-->

## Description

<!-- Short description of the change -->

## Traceability

- Feature ID: `FEAT-...`
- Spec Path: `specs/features/<feature-id>-<short-name>/feature-spec.md`
- Test Plan Path: `specs/features/<feature-id>-<short-name>/test-plan.md`

## Spec & Test Plan

- [ ] Feature spec added/updated: `specs/features/<feature-id>-<short-name>/feature-spec.md`
- [ ] Test plan added/updated: `specs/features/<feature-id>-<short-name>/test-plan.md`
- [ ] This MR does not implement behavior outside the linked spec
- [ ] If the request started as raw business input, `business-request.md` / `spec-refinement.md` were created or updated first

## Checklist

- [ ] Code compiles and tests pass
- [ ] Documentation updated if needed
- [ ] Authorization docs updated if routes, roles, or access rules changed
