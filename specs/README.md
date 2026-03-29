# Specs

This folder contains the repository's source-of-truth product and feature artifacts.

## Suggested Areas

- `product/`: product vision, goals, and higher-level requirements
- `features/`: feature packages derived from user needs
- `ux/`: journey maps, interaction notes, accessibility expectations
- `api/`: API contracts and integration expectations
- `architecture/`: durable system, container, component, deployment, dynamic, and data structure references
- `test-cases/`: test inventories and feature-level testing artifacts
- `nfr/`: non-functional requirements such as security, performance, and resilience
- `decisions/`: ADRs and other durable technical decisions

The spec-driven operating model, role system, and orchestration guidance now live under `delivery/`.

## Feature Package Convention

Each feature should normally live in a dedicated folder under `specs/features/`.

Recommended structure:

```text
specs/features/FEAT-XXX-short-name/
  business-request.md
  spec-refinement.md
  business-approval-summary.md
  feature-spec.md
  api-spec.md
  adr.md
  test-plan.md
  task-breakdown.md
  validation-report.md
```

Not every artifact is required for every feature, but the choice should be explicit.
