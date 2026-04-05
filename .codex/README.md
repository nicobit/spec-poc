# Codex Workspace Guidance

Codex should use this repository as a spec-driven delivery workspace rather than a code-only workspace.

## Read First

- `delivery/workflows/business-to-spec-workflow.md`
- `delivery/workflows/spec-driven-delivery.md`
- `delivery/workflows/agent-orchestration.md`
- `delivery/governance/ai-working-contract.md`
- `delivery/governance/traceability.md`
- `delivery/governance/definition-of-done.md`
- `delivery/governance/ai-collaboration.md`
- `delivery/roles/agent-role-catalog.md`
- `delivery/roles/README.md`

## Codex Expectations

- use `delivery/governance/ai-working-contract.md` as the shared minimum behavior layer across Copilot, Codex, and Claude
- treat a short high-level request as valid input for orchestration
- start feature-like work with `agents/feature-orchestrator.md`, not with implementation
- classify the request as feature, UI standardization, backend or platform change, bug fix, docs-only, or trivial change
- treat UI standardization, shared component adoption, and layout harmonization as feature-like work
- begin business-originated requests with Business Analyst style refinement
- understand the feature intent before changing code
- do not implement feature code from a raw request when the governing feature package is missing or stale
- create or update the governing feature package under `specs/features/...` before implementation
- align implementation to explicit requirements and acceptance criteria
- keep frontend and backend changes traceable to specs
- include tests and docs in the same delivery flow
- treat `delivery/workflows/agent-orchestration.md` as the shared role sequence and `delivery/governance/definition-of-done.md` as the completion gate
- call out assumptions, residual risk, and validation status

For a raw feature-like request, the default Codex path is: use `agents/feature-orchestrator.md`, draft the minimum governing feature package, review the spec, then continue into implementation only when asked.

## Backend Expectations

- prefer `backend/shared/...` as the stable shared import surface
- preserve compatibility between Azure Functions adapters and `backend/runtimes/asgi/app.py`
- keep Azure Functions `authLevel` intentionally `anonymous` unless repository policy changes
- enforce application-level auth on all backend routes except `GET /health/healthz`
- prefer lazy initialization for secrets, SDK clients, and external service connections
- keep Azure deployment updates aligned with both GitHub and GitLab CI/CD flows

## Codex-Specific Assets

**Agents** (`agents/`):
- `feature-orchestrator.md` — primary entrypoint for feature work
- `role-routing.md` — decides which role to activate
- `business-analyst.md`, `architect.md`, `python-engineer.md`, `reactjs-expert.md`
- `test-manager.md`, `devops-engineer.md`
- `automation-tester.md`, `documentation-owner.md`, `security-reviewer.md`, `ux-expert.md`
- `critical-thinking.md` — challenges assumptions before committing to design decisions

**Prompts** (`prompts/`) — generation templates with structured output formats:
- `feature-delivery.md` — end-to-end feature workflow entrypoint
- `spec-refinement.md` — generate `spec-refinement.md` from a business-request
- `feature-spec.md` — generate `feature-spec.md` with preconditions, requirements, and AC postconditions
- `entity-model.md` — update `specs/architecture/data-model.md` with Mermaid ER and attribute tables
- `task-breakdown.md` — generate `task-breakdown.md` with parallel markers
- `backend-implementation.md` — implement Python shared logic + Azure Functions adapter + tests
- `frontend-implementation.md` — implement React types + hooks + components + tests
- `validation-report.md` — generate `validation-report.md` with traceability matrix and DoD checklist

**Skills** (`skills/`): see individual `SKILL.md` files for reusable skill definitions

Reuse the canonical templates in `../templates/` when creating new delivery artifacts.
Prefer pointing Codex agents, skills, and the feature-delivery entrypoint prompt at the shared workflow and role files instead of duplicating those instructions locally.
Treat `delivery/agents/codex-mapping.md` as the canonical explanation of how Codex adapters map to the framework agent model.
When you want one sequential Codex entrypoint for feature work, start with `agents/feature-orchestrator.md`.
