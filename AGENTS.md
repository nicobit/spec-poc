# AGENTS.md

This repository uses a spec-driven delivery model.

## Core Rule

Specifications are first-class artifacts. Code implements the specs; it is not the source of truth.

## Start Here

Read these first when relevant:

- `README.md`
- `delivery/workflows/spec-driven-delivery.md`
- `delivery/workflows/business-to-spec-workflow.md`
- `delivery/governance/ai-working-contract.md`
- `delivery/governance/traceability.md`
- `delivery/governance/definition-of-done.md`
- `delivery/roles/agent-role-catalog.md`
- `delivery/roles/`
- `delivery/agents/agent-model.md`
- `delivery/agents/github-mapping.md`
- `delivery/agents/claude-mapping.md`
- `delivery/agents/codex-mapping.md`

## Working Contract

Use [AI Working Contract](delivery/governance/ai-working-contract.md) as the shared cross-agent behavior layer.

When handling a feature:

1. Classify the request.
2. If the request is feature-like, create or update the governing feature package under `specs/features/...`.
3. Follow the minimum package and implementation-transition rules from [AI Working Contract](delivery/governance/ai-working-contract.md).
4. Identify the active role or roles.
5. Make assumptions and open questions explicit.
6. Derive acceptance criteria and tests before implementation.
7. Implement the smallest correct solution.
8. Update documentation and validation evidence.

See [README.md](README.md) for the main repository map and [Spec-Driven Delivery](delivery/workflows/spec-driven-delivery.md) for the canonical workflow.

## Feature Package Convention

Feature artifacts should normally live under:

`specs/features/FEAT-<area>-<id>-<short-name>/`

Typical contents:

- `business-request.md`
- `spec-refinement.md`
- `business-approval-summary.md`
- `feature-spec.md`
- `api-spec.md`
- `adr.md`
- `test-plan.md`
- `task-breakdown.md`
- `validation-report.md`

## Repo Structure Principle

Do not assume a single top-level `src/` model for this repository.

- `frontend/` and `backend/` are separate application areas
- `delivery/`, `specs/`, and `docs/` are first-class repository assets with different purposes
- backend logic should gradually separate into shared logic, contracts, and runtime-specific adapters

## Backend Operating Rules

When working in `backend/`:

- prefer `backend/shared/...` as the runtime-agnostic import surface
- keep Azure Functions folders as thin adapters where practical
- preserve compatibility with the ASGI runtime in `backend/runtimes/asgi/app.py`
- treat Azure Functions `authLevel` as intentionally `anonymous` at the platform layer
- keep application-level authentication on all backend routes except `GET /health/healthz`
- prefer lazy initialization for secrets, clients, and external connections

The current backend delivery path includes:

- foundation IaC in `backend/deployment/foundation/`
- App Service IaC in `backend/deployment/appservice/`
- managed identity access IaC in `backend/deployment/access/`
- Azure bootstrap guidance in `docs/standards/platform/appservice-bootstrap.md`

## Skills

Reusable repo skills live in:

- `.codex/skills/`
- `.github/skills/`

Use them when the task matches their scope.

