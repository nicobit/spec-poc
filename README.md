# admin-portal

`admin-portal` is a reference repository for spec-driven development.

The goal is to show how a team can turn a business request into:
- refined specifications
- architecture and design decisions
- test cases and automated tests
- implementation across frontend and backend
- documentation and validation evidence

The repository starts with:
- `frontend/`: the current React application
- `backend/`: the current backend workspace, starting with Azure Functions

Over time, the backend can evolve beyond Functions to other Azure hosting models such as containers, Kubernetes, and PaaS services. The specifications should stay stable even if the runtime changes.

## Repository Model

The repository treats specifications as first-class artifacts. Code is an implementation of the specs, not the source of truth.

The canonical delivery flow is:

1. Capture the user need.
2. Refine the need into a feature specification.
3. Define architecture, UX, API, and non-functional expectations.
4. Produce acceptance criteria and test scenarios.
5. Implement frontend and backend changes.
6. Add or update automated tests.
7. Produce a validation report and documentation updates.

## Start Here

If you are new to this repository, use this order:

1. Read [Spec-Driven Delivery](delivery/workflows/spec-driven-delivery.md).
2. If the request starts as a business or high-level request, read [Business To Spec Workflow](delivery/workflows/business-to-spec-workflow.md).
3. Read [AI Working Contract](delivery/governance/ai-working-contract.md) for the shared minimum rules used by Copilot, Codex, and Claude.
4. Create or update the feature package under `specs/features/FEAT-<area>-<id>-<short-name>/`.
5. Start with the minimum artifact set and implementation-transition rules defined in [AI Working Contract](delivery/governance/ai-working-contract.md), including the artifact decision table.
6. Only then implement code.

Quick entrypoints:

- Business user: start with [Business Request Template](templates/business-request.template.md)
- Business user with AI: start with [Start From Idea](docs/spec-driven/start-from-idea.md)
- Human contributor: start with [Adding A New Feature](#adding-a-new-feature)
- GitHub Copilot: start with [GitHub Copilot Guidance](.github/copilot-instructions.md)
- Claude: start with [Claude Workspace Guidance](.claude/README.md)
- Codex: start with [Codex Workspace Guidance](.codex/README.md)

For a raw feature-like request, the default AI-assisted starting point is `Feature Orchestrator`: give the request, let it draft the minimum governing feature package, review the spec, then ask for implementation only when ready.

Instruction priority for AI tools:

1. [AGENTS.md](AGENTS.md)
2. [AI Working Contract](delivery/governance/ai-working-contract.md)
3. core workflow docs under [delivery/workflows](delivery/workflows/)
4. tool-specific adapter docs under `.github/`, `.claude/`, and `.codex/`
5. secondary summaries and reference docs

## Key Folders

- `delivery/`: spec-driven orchestration, governance, and canonical role definitions
- `specs/`: product, feature, architecture, API, testing, and validation artifacts
- `docs/`: publishable contributor, operational, and engineering documentation
- `templates/`: canonical templates used to create delivery artifacts
- `.github/`: GitHub Copilot and GitHub workflow instructions
- `.claude/`: Claude-specific adapter guidance
- `.codex/`: Codex-specific adapter guidance and skills
- `tests/`: cross-cutting contract, integration, and end-to-end test suites as they are added

Use these boundaries consistently:

- `delivery/` explains how work is refined, orchestrated, and validated
- `specs/` defines what should be built and verified
- `docs/` explains the repository, system, and operating guidance for contributors and operators

## Canonical Documents

Use these as the main reference set:

- [Spec-Driven Delivery](delivery/workflows/spec-driven-delivery.md)
- [Business To Spec Workflow](delivery/workflows/business-to-spec-workflow.md)
- [Project Constitution](delivery/governance/constitution.md)
- [Traceability Standard](delivery/governance/traceability.md)
- [Definition Of Done](delivery/governance/definition-of-done.md)
- [Engineering Standards](docs/standards/engineering/engineering-standards.md)
- [Testing Strategy](docs/standards/engineering/testing-strategy.md)
- [UI Standards](docs/standards/frontend/ui-standards.md)
- [DevOps Delivery Model](docs/standards/platform/devops-delivery-model.md)
- [UI Component Governance](docs/standards/frontend/ui-component-governance.md)
- [Glossary](docs/standards/engineering/glossary.md)
- [Contributor Workflow](docs/contribution/contributor-workflow.md)
- [Target Repository Structure](delivery/workflows/repo-structure-target.md)
- [Agent Role Catalog](delivery/roles/agent-role-catalog.md)
- [Canonical Agent Model](delivery/agents/agent-model.md)

## Expectations For AI-Assisted Delivery

GitHub Copilot, Claude, and Codex should all follow the same working contract:

- read the relevant spec first
- identify missing information and surface assumptions explicitly
- derive acceptance criteria and tests before implementation
- preserve traceability from requirement to code and tests
- update documentation when behavior changes
- prefer changing the smallest correct surface area

Tool-specific instructions live in:

- [GitHub Copilot Guidance](.github/copilot-instructions.md)
- [Claude Workspace Guidance](.claude/README.md)
- [Codex Workspace Guidance](.codex/README.md)

Automation support is included for both GitHub and GitLab:

- GitHub Actions workflows in [.github/workflows](.github/workflows/)
- GitLab CI in [.gitlab-ci.yml](.gitlab-ci.yml)

Container publishing guidance is documented in [Container Delivery](docs/standards/platform/container-delivery.md).
Azure App Service deployment guidance is documented in [Azure App Service Deployment](docs/standards/platform/appservice-deployment.md).
Azure App Service infrastructure guidance is documented in [Azure App Service Infrastructure](docs/standards/platform/appservice-infrastructure.md).
Azure App Service bootstrap guidance is documented in [Azure App Service Bootstrap](docs/standards/platform/appservice-bootstrap.md).
Backend runtime settings guidance is documented in [Backend App Settings](docs/standards/platform/backend-app-settings.md).

Shared canonical role definitions live in [delivery/roles](delivery/roles/README.md).
Shared canonical agent model guidance lives in [delivery/agents](delivery/agents/README.md).
Reusable skills live in [GitHub Copilot Skills](.github/skills/README.md) and [Codex Skills](.codex/skills/README.md).

## Suggested Feature Delivery Artifacts

For each significant feature, create a set of artifacts derived from the templates:

1. Feature specification
2. API specification if contracts change
3. ADR if an architectural choice is introduced
4. Test plan
5. Task breakdown
6. Validation report

The templates live in [templates](templates/README.md).

## Adding A New Feature

Start from the spec package, not from code.

For any significant feature request, the intended default is autonomous package creation:

1. start with a high-level request or an existing feature package
2. let the orchestrator classify the request and create or update the governing folder under `specs/features/FEAT-<area>-<id>-<short-name>/`
   - when the work evolves an existing feature, update that feature's governing package instead of creating a new disconnected one
   - create a new package only when the work is genuinely separate in user-facing capability or scope
3. start with the minimum artifact set:
   - `business-request.md`
   - `spec-refinement.md`
   - `feature-spec.md`
   - `validation-report.md` at closure
4. add optional artifacts only when needed:
   - `test-plan.md` when behavior changes materially
   - `api-spec.md` when contracts change
   - `adr.md` when a significant design decision must be recorded
   - `task-breakdown.md` when execution sequencing should be explicit
   - `research.md` when a technology or approach decision requires investigation
5. confirm the proposed approach does not conflict with [Project Constitution](delivery/governance/constitution.md)
6. only then implement code against the governing package

If you are working manually, follow the same structure yourself and keep the feature package as the source of truth.

PRs are expected to include:

- `Feature ID`
- `Spec Path`
- `Test Plan Path`

Repository checks now enforce this traceability for feature code changes.

When starting work in GitHub, prefer the issue templates in [`.github/ISSUE_TEMPLATE`](.github/ISSUE_TEMPLATE/) so the request enters the system with the required spec references.

## Business User Entry Point

Business users should start with:

1. [Business Request Template](templates/business-request.template.md)
2. [Business To Spec Workflow](delivery/workflows/business-to-spec-workflow.md)
3. [Glossary](docs/standards/engineering/glossary.md)

## Example Feature Package

See [FEAT-ADMIN-001 User Directory](specs/features/FEAT-ADMIN-001-user-directory/README.md) for a full worked example from business request to validation-ready artifacts.

## Environments Management (new)

This repository now includes an Environments Management feature to view, control and schedule start/stop lifecycle operations for managed environments.

- Feature package: [FEAT-ENVIRONMENTS-001 Environments Management](specs/features/FEAT-ENVIRONMENTS-001-management/README.md)
- Feature spec: [feature-spec.md](specs/features/FEAT-ENVIRONMENTS-001-management/feature-spec.md)
- Developer docs: [docs/environments/README.md](docs/environments/README.md)
- Function READMEs: `backend/function_environment/README.md`, `backend/function_scheduler_timer/README.md`, `backend/function_scheduler_worker/README.md`

Local testing
- See `docs/environments/README.md` for quick local run instructions. Use the per-function READMEs inside `backend/` for more targeted testing steps.
