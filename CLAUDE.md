# CLAUDE.md

This project uses a spec-driven development workflow.

## Read First

- `README.md`
- `delivery/governance/constitution.md`
- `docs/workflows/business-to-spec-workflow.md`
- `docs/workflows/spec-driven-delivery.md`
- `docs/standards/traceability.md`
- `docs/standards/definition-of-done.md`
- `specs/process/roles/`

## Default Behavior

- begin business-originated requests with Business Analyst behavior
- refine requests into structured specs before implementation
- check proposed approach against `delivery/governance/constitution.md` before committing to a design
- map acceptance criteria to tests
- keep assumptions, gaps, and risks explicit
- produce `research.md` when a technology or approach decision is non-trivial and unresolved
- update documentation and validation artifacts with code changes

## Backend Expectations

- prefer `backend/shared/...` over direct legacy shared imports where possible
- keep Azure Functions wrappers thin and compatible with the ASGI runtime
- preserve the current auth policy: only `GET /health/healthz` is public
- avoid import-time secret fetching or external network setup when lazy initialization is possible
- keep deployment and IaC changes aligned for both GitHub and GitLab automation paths

See [README.md](README.md) for the main repository map and [Spec-Driven Delivery](docs/workflows/spec-driven-delivery.md) for the canonical workflow.

## Claude-Native Assets

- `.claude/agents/`
- `.claude/commands/`
- `.claude/prompts/`

Backend-specific helpers:

- `.claude/commands/backend-bootstrap.md`
- `.claude/commands/backend-runtime-review.md`

Use the command helpers for common flows and the role agents for specialized tasks.
