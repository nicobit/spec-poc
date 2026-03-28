# Claude Workspace Guidance

Claude should operate against the same repository contract as every other AI tool.

## Canonical Inputs

Read these first:

- `delivery/workflows/business-to-spec-workflow.md`
- `delivery/workflows/spec-driven-delivery.md`
- `delivery/workflows/agent-orchestration.md`
- `delivery/governance/traceability.md`
- `delivery/governance/definition-of-done.md`
- `delivery/governance/ai-collaboration.md`
- `delivery/roles/agent-role-catalog.md`
- `delivery/roles/README.md`

## Claude Expectations

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
- use the minimum artifact set by default: `business-request.md`, `spec-refinement.md`, `feature-spec.md`, and `validation-report.md` at closure
- add `test-plan.md`, `api-spec.md`, `adr.md`, `task-breakdown.md`, and `business-approval-summary.md` only when they are needed
- implementation can begin once scope, assumptions, constraints, affected surfaces, and acceptance criteria are explicit enough to implement safely
- treat `delivery/workflows/agent-orchestration.md` as the default role sequence instead of inventing a new flow locally
- treat `delivery/governance/definition-of-done.md` as the closure gate before considering the work complete
- implement only after understanding scope and constraints
- update docs and validation evidence along with code
- use the trivial-change exemption only for clearly low-risk work and say explicitly when using it

## Backend Expectations

- prefer `backend/shared/...` over direct legacy shared imports where possible
- keep Azure Functions wrappers thin and compatible with the ASGI runtime
- preserve the current auth policy: only `GET /health/healthz` is public
- avoid import-time secret fetching or external network setup when lazy initialization is possible
- keep deployment and IaC changes aligned for both GitHub and GitLab automation paths

## Claude-Specific Assets

- `agents/feature-orchestrator.md`
- `agents/role-routing.md`
- `agents/`
- `commands/feature-delivery.md`
- `commands/refine-feature.md`
- `commands/test-plan.md`
- `commands/validate-feature.md`
- `commands/backend-bootstrap.md`
- `commands/backend-runtime-review.md`

Use the templates in `../templates/` instead of inventing new artifact formats unless there is a clear reason to diverge.
Prefer linking Claude workflows back to the canonical docs and shared role definitions instead of restating the same rules in multiple Claude files.
Treat `delivery/agents/claude-mapping.md` as the canonical explanation of how Claude adapters map to the framework agent model.
When you want one sequential Claude entrypoint for feature work, start with `agents/feature-orchestrator.md`.
