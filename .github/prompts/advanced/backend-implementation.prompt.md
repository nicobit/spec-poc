---
agent: agent
description: "Implement approved backend behavior in Python — shared domain model, storage abstraction, thin Azure Functions adapter, ASGI route, and tests"
tools:
  - codebase
  - editFiles
  - readFiles
  - runCommands
---

# Backend Implementation Prompt

You are acting as Python Engineer for this repository.

Read the approved feature spec and implement the backend behavior following admin-portal's architecture: shared domain logic in `backend/shared/`, thin Azure Functions wrappers, and ASGI runtime compatibility.

## Steps

1. Read `delivery/governance/constitution.md` — confirm no article conflicts; do not proceed if conflicts exist
2. Read `specs/features/<FEAT-ID>/feature-spec.md` and `api-spec.md`
3. Read `backend/README.md` and `docs/standards/engineering/engineering-standards.md`
4. Check existing patterns in `backend/shared/` before creating new modules
5. Implement in order: Model → Store → Function adapter → ASGI route → Tests

## File Headers

Every new implementation file must begin with a FEAT reference:

```python
# FEAT-<AREA>-XXX: <Short Name>
```

## Implementation Order

### 1. `backend/shared/<entity>_model.py` — Pydantic domain model
- Define the domain entity as a Pydantic model
- Include `id`, `created_at`, `updated_at` where applicable
- Keep the model portable — no Azure-specific imports at model level
- Reference acceptance criteria in docstrings: `# AC-<AREA>-XXX`

### 2. `backend/shared/<entity>_store.py` — Storage abstraction
- Follow existing store patterns (Cosmos / Table Storage / in-memory fallback)
- In-memory fallback for local dev and tests; no import-time resolution of connections
- Secrets and connection strings resolved lazily on first use (Article VI)

### 3. `backend/function_<domain>/function_app.py` — Azure Functions adapter
- Thin trigger: validate input, call shared logic, return response
- Keep `authLevel` as `anonymous` — application-level auth is enforced separately (Article IV)
- No business logic in the function wrapper (Article V)

### 4. `backend/runtimes/asgi/app.py` or relevant router — ASGI route
- Thin route handler — delegate to shared logic
- Enforce authentication on all routes except `GET /health/healthz` (Article IV)
- Keep route handler compatible with both Azure Functions and ASGI runtime (Article V)

### 5. `backend/tests/test_<domain>.py` — Tests
- Cover the main AC path + error paths + edge cases
- Reference AC identifiers in test docstrings: `"""AC-<AREA>-XXX: ..."""`
- Use in-memory store or dependency injection for unit tests
- Use realistic integration setup for cross-boundary verification (Article VIII)

## Quality Gates

Before considering implementation complete:

- [ ] No import-time secrets, credentials, or external network calls (Article VI)
- [ ] All routes except `GET /health/healthz` require authentication (Article IV)
- [ ] Domain logic lives in `backend/shared/`, not in function wrappers (Article V)
- [ ] Tests reference acceptance criteria identifiers in docstrings
- [ ] In-memory fallback present for local dev and test scenarios
- [ ] CI passes

---
Feature to implement (provide FEAT-ID or paste feature-spec content):
