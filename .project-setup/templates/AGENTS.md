# AGENTS.md

Use this as a starting point and replace placeholders with the target repo's actual architecture.

## Project Overview

This repository contains `<PROJECT_TYPE>` built with `<PRIMARY_STACK>`.

The goal of these agent boundaries is to keep changes deterministic, reviewable, and aligned with the project architecture.

## Global Handoff Rules

- If a change touches public API contracts, involve the API or Backend agent and the Testing agent.
- If a change touches data shape, migrations, or persistence rules, involve the Data or Schema agent.
- If a change touches user-facing interaction or rendering, involve the UI or Frontend agent.
- If a change updates build, CI, deployment, or environment configuration, involve the Infrastructure or Delivery agent.
- If a change updates tests or introduces new behavior, involve the Testing agent.
- If a change updates README, guides, onboarding, or ADRs, involve the Docs agent.
- If a change crosses multiple layers or introduces non-trivial design impact, involve the Quality or Architecture guard.

## Precedence Rules

- Domain owners take precedence over quality guards for domain-specific decisions.
- Data or Schema decisions take precedence over UI convenience.
- API contract stability takes precedence over internal refactoring convenience.
- Testing expectations must reflect the owning domain's invariants.

## Definition Of Done

- Build succeeds using the repository's real build command.
- Tests relevant to the change are added or updated and pass.
- No undocumented breaking changes are introduced.
- Documentation is updated when behavior, workflows, or public interfaces change.
- The change is minimal and localized to the task.

---

## Frontend Agent

**Responsibilities**
- UI components, interactions, routing, client-side state, accessibility, and rendering performance

**Allowed areas**
- `frontend/**`
- `src/ui/**`
- `src/components/**`

**Forbidden areas**
- backend domain rules unless required to surface validation or errors
- schema or persistence rules

**Handoff rules**
- If UI work requires API shape changes, involve the Backend or API agent.
- If UI work changes persisted client state, involve the Data or Schema agent.

**Done checklist**
- [ ] User-facing behavior matches the task
- [ ] Accessibility and keyboard interactions are preserved
- [ ] No invented API usage

---

## Backend Or API Agent

**Responsibilities**
- API handlers, domain services, validation, authorization, orchestration, and integration boundaries

**Allowed areas**
- `backend/**`
- `src/api/**`
- `src/services/**`

**Forbidden areas**
- frontend presentation details
- schema migrations without Data or Schema agent involvement

**Handoff rules**
- If a change affects request or response contracts, involve the Testing agent and Docs agent.
- If a change requires data model changes, involve the Data or Schema agent.

**Done checklist**
- [ ] Public contracts are validated
- [ ] Error handling is explicit
- [ ] Logging or observability expectations are preserved

---

## Data Or Schema Agent

**Responsibilities**
- database schema, migrations, ORM mappings, serialization shape, and data integrity rules

**Allowed areas**
- `db/**`
- `migrations/**`
- `src/data/**`
- `src/models/**`

**Forbidden areas**
- UI-only concerns

**Handoff rules**
- If schema changes affect APIs, involve the Backend or API agent.
- If schema changes affect tests or fixtures, involve the Testing agent.

**Done checklist**
- [ ] Data changes are backward-compatible or explicitly documented
- [ ] Migrations are safe and reviewable
- [ ] Rollback or compatibility concerns are called out

---

## Testing Agent

**Responsibilities**
- unit, integration, end-to-end, fixtures, harnesses, and validation of regressions

**Allowed areas**
- `tests/**`
- `**/__tests__/**`
- test config files

**Forbidden areas**
- unrelated functional refactors

**Handoff rules**
- Request context from the owning domain agent when a test encodes business rules or API invariants.

**Done checklist**
- [ ] Tests are deterministic
- [ ] New behavior or fixes are covered
- [ ] Flaky timing assumptions are avoided

---

## Docs Agent

**Responsibilities**
- README, onboarding, ADRs, architecture notes, changelog, and developer workflow docs

**Allowed areas**
- `README.md`
- `docs/**`
- `CHANGELOG.md`

**Forbidden areas**
- functional code changes unless specifically requested as part of documentation examples

**Handoff rules**
- Confirm behavior with the owning domain agent when docs describe new or changed behavior.

**Done checklist**
- [ ] Commands and paths are real
- [ ] Examples match the current codebase
- [ ] No invented behavior or workflows

---

## Quality Or Architecture Guard

**Responsibilities**
- cross-cutting design review, boundary enforcement, maintainability, naming, and refactor risk assessment

**Allowed areas**
- architecture notes
- shared interfaces
- public modules

**Forbidden areas**
- overriding domain owners on domain semantics

**Handoff rules**
- Escalate when a change creates coupling across multiple modules, changes shared abstractions, or affects public contracts.

**Done checklist**
- [ ] Responsibilities remain clear
- [ ] Public interfaces are coherent
- [ ] Change scope remains reviewable
