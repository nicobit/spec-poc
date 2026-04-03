# Delivery

This folder contains the repository's canonical spec-driven delivery system.

Use it for the logic that governs how work is refined, orchestrated, validated, and handed off across humans and AI agents.

## Areas

- `workflows/`: end-to-end delivery flow, orchestration, and routing guidance
- `governance/`: traceability, definition of done, and AI collaboration rules
- `roles/`: canonical role definitions, catalog, and role checklists

## Priority

Treat these as the framework core:

- `workflows/spec-driven-delivery.md`
- `workflows/business-to-spec-workflow.md`
- `workflows/agent-orchestration.md`
- `governance/traceability.md`
- `governance/definition-of-done.md`
- `roles/`

Treat these as secondary layers that should justify their complexity through actual usage:

- `governance/ai-collaboration.md`
- `workflows/copilot-agent-routing.md`
- `workflows/repo-structure-target.md`
- `workflows/delivery-lifecycle.md`
- `roles/role-checklists.md`
- `agents/`

Treat these as convenience summaries or generic references rather than the primary execution path:

- `workflows/delivery-lifecycle.md`
- `roles/role-checklists.md`
- `roles/backend-engineer.md`

If the framework starts to feel heavy, simplify the secondary layers before changing the core.

## Boundary

Use `delivery/` for the operating model of spec-driven delivery.

Use `specs/` for product, feature, API, architecture, and validation artifacts that describe what should be built.

Use `docs/` for publishable contributor, operational, and engineering documentation about the repository and system.
