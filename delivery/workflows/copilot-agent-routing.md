# Copilot Agent Routing

This document explains which GitHub Copilot agent or skill to use at each stage of the repository's spec-driven workflow.

Use it together with:

- [spec-driven-delivery.md](spec-driven-delivery.md)
- [agent-orchestration.md](agent-orchestration.md)
- [traceability.md](../governance/traceability.md)

## Core Rule

Do not start with an implementation agent when the request is still ambiguous.

Use the earliest role that matches the current state of the work:

- unclear request -> Business Analyst
- design decision needed -> Solution Architect
- UI interaction/design guidance needed -> UX Expert
- test strategy needed -> Test Manager
- implementation ready -> ReactJS Expert or Python Engineer
- automation coverage needed -> Automation Tester
- release or infrastructure impact -> DevOps Engineer
- auth or permission impact -> Security Reviewer plus authorization-doc-review skill
- documentation completeness check -> Documentation Owner

## Routing By Situation

### Raw feature request

Use:

1. `Business Analyst`
2. `Solution Architect` if contracts, boundaries, or ADR questions appear
3. `UX Expert` if UI or user journey is affected
4. `Test Manager`

Do not use implementation agents yet unless the feature package is already good enough.

### Approved feature spec, frontend work

Use:

1. `ReactJS Expert`
2. `Automation Tester` for automated coverage
3. `Documentation Owner` if user-facing behavior changed materially

Add skill:

- `ui-consistency` when creating or changing pages/components

### Approved feature spec, backend work

Use:

1. `Python Engineer`
2. `Automation Tester` when backend test coverage changes
3. `Security Reviewer` if roles, auth, or route exposure changed
4. `Documentation Owner` if operational behavior changed

Add skills as needed:

- `backend-auth-hardening`
- `backend-runtime-portability`
- `authorization-doc-review`

### API contract change

Use:

1. `Solution Architect`
2. `Test Manager`
3. implementation agent

Add skill:

- `api-contract-design`

### Roles or authorization change

Use:

1. `Security Reviewer`
2. implementation agent if code changes are needed
3. `Documentation Owner`

Add skill:

- `authorization-doc-review`

Required updates usually include:

- `docs/standards/security/access-control-matrix.md`
- `docs/standards/security/module-authorization.md`
- feature spec and test plan when feature-scoped

### Spec completeness or traceability check

Use:

1. `Business Analyst` if the spec is incomplete
2. `Test Manager` if test mapping is incomplete
3. `Documentation Owner` if docs/validation are incomplete

Add skill:

- `spec-traceability-review`

### CI/CD, deployment, or release change

Use:

1. `DevOps Engineer`
2. `Documentation Owner` if runbooks or contributor docs change

Add skills as needed:

- `devops-ci-cd-update`
- `backend-appservice-bootstrap`

## Recommended Minimal Sequences

### New feature

1. `Business Analyst`
2. `Solution Architect`
3. `UX Expert` when UI is involved
4. `Test Manager`
5. implementation agent
6. `Automation Tester`
7. `DevOps Engineer` if delivery/runtime changes
8. `Documentation Owner`

### Small bug fix with clear scope

1. implementation agent
2. `Automation Tester` if a regression test is needed
3. `Security Reviewer` only if access behavior changed
4. `Documentation Owner` if user-visible behavior changed

### Auth-sensitive fix

1. `Security Reviewer`
2. implementation agent
3. `authorization-doc-review`
4. `Automation Tester`

## Skill Routing

Use skills for detailed, repeatable workflows.

Prefer skills when the task is:

- narrower than a full role
- documentation-heavy
- standards-heavy
- review-oriented
- reusable across many features

Current high-value repository skills:

- `feature-refinement`
- `api-contract-design`
- `test-plan-generation`
- `ui-consistency`
- `backend-auth-hardening`
- `backend-runtime-portability`
- `backend-appservice-bootstrap`
- `authorization-doc-review`
- `spec-traceability-review`

## Prompt Pattern For Contributors

When using Copilot Chat, start prompts like this:

```text
Use the <Agent Name> agent.
Read the relevant feature package under specs/features/FEAT-... first.
If auth, docs, or traceability are affected, also apply the relevant repository skill.
```

Example:

```text
Use the Security Reviewer agent.
Review the authorization impact of this environments-management change.
Also apply the authorization-doc-review skill and update the central authorization docs if needed.
```

