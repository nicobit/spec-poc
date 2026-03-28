# Codex Workspace Guidance

Codex should use this repository as a spec-driven delivery workspace rather than a code-only workspace.

## Read First

- `delivery/workflows/business-to-spec-workflow.md`
- `delivery/workflows/spec-driven-delivery.md`
- `delivery/workflows/agent-orchestration.md`
- `delivery/governance/traceability.md`
- `delivery/governance/definition-of-done.md`
- `delivery/governance/ai-collaboration.md`
- `delivery/roles/agent-role-catalog.md`
- `delivery/roles/README.md`

## Codex Expectations

- treat a short high-level request as valid input for orchestration
- start feature-like work with `agents/feature-orchestrator.md`, not with implementation
- classify the request as feature, UI standardization, backend or platform change, bug fix, docs-only, or trivial change
- treat UI standardization, shared component adoption, and layout harmonization as feature-like work
- begin business-originated requests with Business Analyst style refinement
- understand the feature intent before changing code
- do not implement feature code from a raw request when the governing feature package is missing or stale
- create or update the governing feature package under `specs/features/...` before implementation
- use the minimum artifact set by default: `business-request.md`, `spec-refinement.md`, `feature-spec.md`, and `validation-report.md` at closure
- add `test-plan.md`, `api-spec.md`, `adr.md`, `task-breakdown.md`, and `business-approval-summary.md` only when they are needed
- implementation can begin once scope, assumptions, constraints, affected surfaces, and acceptance criteria are explicit enough to implement safely
- align implementation to explicit requirements and acceptance criteria
- keep frontend and backend changes traceable to specs
- include tests and docs in the same delivery flow
- treat `delivery/workflows/agent-orchestration.md` as the shared role sequence and `delivery/governance/definition-of-done.md` as the completion gate
- call out assumptions, residual risk, and validation status
- use the trivial-change exemption only for clearly low-risk work and say explicitly when using it

## Backend Expectations

- prefer `backend/shared/...` as the stable shared import surface
- preserve compatibility between Azure Functions adapters and `backend/runtimes/asgi/app.py`
- keep Azure Functions `authLevel` intentionally `anonymous` unless repository policy changes
- enforce application-level auth on all backend routes except `GET /health/healthz`
- prefer lazy initialization for secrets, SDK clients, and external service connections
- keep Azure deployment updates aligned with both GitHub and GitLab CI/CD flows

## Codex-Specific Assets

- `agents/feature-orchestrator.md`
- `agents/role-routing.md`
- `agents/`
- `prompts/feature-delivery.md`
- `skills/`

Reuse the canonical templates in `../templates/` when creating new delivery artifacts.
Prefer pointing Codex agents, skills, and the feature-delivery entrypoint prompt at the shared workflow and role files instead of duplicating those instructions locally.
Treat `delivery/agents/codex-mapping.md` as the canonical explanation of how Codex adapters map to the framework agent model.
When you want one sequential Codex entrypoint for feature work, start with `agents/feature-orchestrator.md`.
