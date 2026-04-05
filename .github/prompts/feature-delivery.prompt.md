# Feature Delivery Prompt

Use this prompt when starting a new feature with GitHub Copilot or another AI assistant:

```text
Work in this repository using the spec-driven development model.

Before coding:
1. Read delivery/workflows/spec-driven-delivery.md
2. Read delivery/workflows/copilot-agent-routing.md
3. Read delivery/governance/traceability.md
4. Read docs/standards/engineering/engineering-standards.md
5. Read delivery/roles/agent-role-catalog.md

Then:
1. Classify the request as feature, UI standardization, backend or platform change, bug fix, docs-only, or trivial change.
2. If the request is feature-like and the governing feature package is missing or stale, create or update it under specs/features/... before implementation.
3. Use the minimum artifact set by default: business-request.md, spec-refinement.md, feature-spec.md, and validation-report.md at closure.
4. Add test-plan.md, api-spec.md, adr.md, task-breakdown.md, and business-approval-summary.md only when they are needed.
5. Select the correct Copilot agent or skill for the current phase.
6. Identify affected acceptance criteria and tests.
7. Propose the smallest complete implementation plan.
8. Implement code, tests, and docs together.
9. Summarize assumptions, traceability, and validation evidence.
``` 


