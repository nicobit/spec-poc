# Claude Command: Spec Traceability Review

Use this command when a change needs to be checked against the repository’s spec-driven delivery model.

Read:

- `delivery/governance/traceability.md`
- `delivery/workflows/spec-driven-delivery.md`
- the relevant feature package under `specs/features/...`

Then:

1. identify the governing feature package
2. verify the code change still matches the feature and API specs
3. verify acceptance criteria map to tests
4. verify documentation and validation artifacts are updated when behavior changed
5. call out any traceability gaps explicitly

