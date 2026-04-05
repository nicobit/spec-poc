# Claude Workspace Guidance

Claude should operate against the same repository contract as every other AI tool.

## Canonical Inputs

Read these first:

- `delivery/workflows/business-to-spec-workflow.md`
- `delivery/workflows/spec-driven-delivery.md`
- `delivery/workflows/agent-orchestration.md`
- `delivery/governance/ai-working-contract.md`
- `delivery/governance/traceability.md`
- `delivery/governance/definition-of-done.md`
- `delivery/governance/ai-collaboration.md`
- `delivery/roles/agent-role-catalog.md`
- `delivery/roles/README.md`

## Claude Expectations

- use `delivery/governance/ai-working-contract.md` as the shared minimum behavior layer across Copilot, Codex, and Claude
- treat a short high-level request as valid input for orchestration
- start feature-like work with `agents/feature-orchestrator.md`, not with implementation
- classify the request as feature, UI standardization, backend or platform change, bug fix, docs-only, or trivial change
- treat UI standardization, shared component adoption, and layout harmonization as feature-like work
- start business-originated requests with Business Analyst behavior
- refine requests into structured specifications
- keep assumptions explicit
- derive tests from acceptance criteria
- do not implement feature code from a raw request when the governing feature package is missing or stale
- create or update the governing feature package under `specs/features/...` before implementation
- treat `delivery/workflows/agent-orchestration.md` as the default role sequence instead of inventing a new flow locally
- treat `delivery/governance/definition-of-done.md` as the closure gate before considering the work complete
- implement only after understanding scope and constraints
- update docs and validation evidence along with code

For a raw feature-like request, the default Claude path is: use `agents/feature-orchestrator.md`, draft the minimum governing feature package, review the spec, then continue into implementation only when asked.

## Backend Expectations

- prefer `backend/shared/...` over direct legacy shared imports where possible
- keep Azure Functions wrappers thin and compatible with the ASGI runtime
- preserve the current auth policy: only `GET /health/healthz` is public
- avoid import-time secret fetching or external network setup when lazy initialization is possible
- keep deployment and IaC changes aligned for both GitHub and GitLab automation paths

## Claude-Specific Assets

**Agents** (`agents/`):
- `feature-orchestrator.md` — primary entrypoint for feature work
- `role-routing.md` — decides which role to activate
- Full role catalog in `agents/`

**Commands** (`commands/`):
- `feature-delivery.md` — end-to-end feature workflow
- `refine-feature.md` — spec refinement from a business request
- `test-plan.md` — test plan generation
- `validate-feature.md` — validation and DoD review
- `backend-bootstrap.md` — Azure backend setup
- `backend-runtime-review.md` — backend runtime review

**Prompts** (`prompts/`) — generation templates with structured output formats:
- `spec-refinement.md` — generate `spec-refinement.md` from a business-request
- `feature-spec.md` — generate `feature-spec.md` with preconditions, requirements, and AC postconditions
- `entity-model.md` — update `specs/architecture/data-model.md` with Mermaid ER and attribute tables
- `task-breakdown.md` — generate `task-breakdown.md` with parallel markers
- `backend-implementation.md` — implement Python shared logic + Azure Functions adapter + tests
- `frontend-implementation.md` — implement React types + hooks + components + tests
- `validation-report.md` — generate `validation-report.md` with traceability matrix and DoD checklist

Use the templates in `../templates/` instead of inventing new artifact formats unless there is a clear reason to diverge.
Prefer linking Claude workflows back to the canonical docs and shared role definitions instead of restating the same rules in multiple Claude files.
Treat `delivery/agents/claude-mapping.md` as the canonical explanation of how Claude adapters map to the framework agent model.
When you want one sequential Claude entrypoint for feature work, start with `agents/feature-orchestrator.md`.
