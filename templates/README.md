# Templates

Use these templates to keep delivery artifacts consistent across humans and AI tools.

`delivery/` defines how work is orchestrated and validated.

`templates/` defines the standard skeletons for the artifacts produced during that delivery flow.

## Available Templates

Core templates:

- `business-request.template.md`
- `spec-refinement.template.md`
- `feature-spec.template.md`
- `test-plan.template.md`
- `task-breakdown.template.md`
- `validation-report.template.md`

The core templates keep the workflow stable while improving content quality:

- `business-request.template.md` emphasizes actors, desired outcomes, functional needs, non-functional expectations, constraints, assumptions, and open questions.
- `spec-refinement.template.md` emphasizes scope clarification, preconditions, main and alternative flows, business rules, and domain/data considerations.
- `feature-spec.template.md` emphasizes domain terms, business rules, data requirements, state/degraded behavior, and tighter requirement-to-acceptance traceability.

Conditional templates:

- `business-approval-summary.template.md`
- `api-spec.template.md`
- `adr.template.md`
- `research.template.md`
