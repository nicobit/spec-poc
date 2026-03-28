# Engineering Standards

These standards apply to human contributors and AI tools.

## General

- Prefer clear, incremental changes over broad rewrites.
- Keep domain and contract logic separate from hosting-specific concerns.
- Favor stable interfaces and explicit types.
- Make assumptions explicit when the spec is incomplete.

## Frontend

- Keep UI behavior aligned to the feature specification and UX notes.
- Encode accessibility expectations in implementation and tests.
- Use consistent component boundaries and avoid hidden coupling.
- Add tests for significant state transitions and user-critical flows.

## Backend

- Treat Azure Functions as an implementation runtime, not the domain boundary.
- Keep reusable business logic separate from trigger or hosting adapters.
- Define and preserve API contracts explicitly.
- Validate inputs, errors, and edge cases described in the spec.

## DevOps

- CI should validate formatting, linting, type checks, tests, and build viability.
- CD should promote only artifacts that passed required validation gates.
- Infrastructure and deployment choices must stay aligned with ADRs and runtime strategy docs.
- Pipeline changes should include rollback and observability considerations.

## Testing

- Start from acceptance criteria, not from implementation details alone.
- Cover the appropriate layers: unit, contract, integration, and end-to-end.
- Add regression tests for fixed defects.
- Document intentional test gaps in the validation report.

## Documentation

- Update docs when behavior, architecture, deployment, or operating procedures change.
- Prefer concise, decision-oriented documentation.
- Keep templates and instructions current as the repo evolves.
