# Claude Command: Feature Delivery

Use the shared repository sequence from:

- `delivery/workflows/spec-driven-delivery.md`
- `delivery/workflows/agent-orchestration.md`
- `delivery/governance/definition-of-done.md`

Apply it with this Claude-specific contract:

1. Classify the request as feature, UI standardization, backend or platform change, bug fix, docs-only, or trivial change.
2. If the request is business-originated, start with the business request and spec refinement flow.
3. Treat UI standardization, shared component adoption, and layout harmonization as feature-like work.
4. Read the relevant spec and standards.
5. List assumptions and unresolved questions.
6. If the governing feature package under `specs/features/...` is missing, incomplete, or stale, create or update it before implementation.
7. Use the minimum artifact set by default: `business-request.md`, `spec-refinement.md`, `feature-spec.md`, and `validation-report.md` at closure.
8. Create or update `test-plan.md`, `api-spec.md`, `adr.md`, `task-breakdown.md`, and `business-approval-summary.md` only when they are needed.
9. Map acceptance criteria to tests before implementation.
10. Implement code changes only once scope, assumptions, constraints, affected surfaces, and acceptance criteria are explicit enough to implement safely.
11. Add automated tests and documentation updates in the same delivery flow.
12. Produce or update validation evidence and perform a traceability review before closing.

