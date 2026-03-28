# Codex Prompt: Feature Delivery

```text
Use the spec-driven development model for this repository.

Read:
- delivery/workflows/business-to-spec-workflow.md
- delivery/workflows/spec-driven-delivery.md
- delivery/workflows/agent-orchestration.md
- delivery/governance/traceability.md
- delivery/governance/definition-of-done.md
- delivery/governance/ai-collaboration.md
- delivery/roles/agent-role-catalog.md
- delivery/roles/README.md

Then:
1. Classify the request as feature, UI standardization, backend or platform change, bug fix, docs-only, or trivial change.
2. If the request is from a business user, refine it first using the business request and spec refinement templates.
3. Treat UI standardization, shared component adoption, and layout harmonization as feature-like work.
4. If the governing feature package under specs/features/... is missing, incomplete, or stale, create or update it before implementation.
5. Use the minimum artifact set by default: business-request.md, spec-refinement.md, feature-spec.md, and validation-report.md at closure.
6. Add test-plan.md, api-spec.md, adr.md, task-breakdown.md, and business-approval-summary.md only when they are needed.
7. Follow the shared role sequence from delivery/workflows/agent-orchestration.md.
8. Map acceptance criteria to tests before implementation.
9. Only implement once scope, assumptions, constraints, affected surfaces, and acceptance criteria are explicit enough to implement safely.
10. Implement the smallest complete solution against the approved artifacts.
11. Update docs, validation evidence, and traceability links before closing.
12. Summarize assumptions, risks, and completed validation against delivery/governance/definition-of-done.md.
```

