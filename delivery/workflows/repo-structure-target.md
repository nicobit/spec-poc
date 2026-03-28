# Target Repository Structure

This document describes the intended long-term repository structure for `admin-portal`.

## Guiding Principle

This repository is not a single-app codebase. It is a spec-driven workspace containing:

- frontend application code
- backend implementation code
- first-class specifications
- first-class delivery guidance
- tool-specific AI collaboration assets

For that reason, the repository should not use a single top-level `src/` folder.

## Preferred Top-Level Shape

```text
admin-portal/
  frontend/
    src/
    public/
    tests/
  backend/
    shared/
    contracts/
    runtimes/
      azure-functions/
      containers/
    tests/
    deployment/
  specs/
  docs/
  templates/
  tests/
  .github/
  .claude/
  .codex/
```

## Why Not A Top-Level `src/`

A top-level `src/` would make sense if this repository were a single deployable application.

That is not the case here:

- `frontend/` and `backend/` use different stacks and different runtime concerns
- `specs/` is part of the product delivery model, not supporting documentation
- `docs/`, `templates/`, and AI agent guidance are first-class assets
- the backend is intended to support more than one hosting target over time

The better rule is:

- use `src/` inside an individual app where appropriate
- do not force the whole repository into a single code-centric root

## Backend Target Shape

The backend should gradually evolve toward:

```text
backend/
  shared/
  contracts/
  runtimes/
    azure-functions/
    containers/
  tests/
  deployment/
```

### Folder Intent

- `shared/`
  - reusable domain logic
  - service abstractions
  - common models
  - validation utilities
- `contracts/`
  - schemas
  - DTOs
  - API contract definitions
  - integration payload definitions
- `runtimes/azure-functions/`
  - Azure Functions triggers and adapters
  - function-specific entry points and bindings
- `runtimes/containers/`
  - future container-hosted runtime code if needed
- `tests/`
  - backend unit, contract, and integration tests
- `deployment/`
  - IaC
  - deployment scripts
  - environment-specific delivery assets

## Incremental Variant

To avoid a large refactor too early, a smaller intermediate structure is also acceptable:

```text
backend/
  functions/
  shared/
  contracts/
  deployment/
```

This can later become the fuller `runtimes/` model when a second backend runtime is introduced.
