# Testing Strategy

Tests in this repository should be derived from acceptance criteria and risk, not from implementation details alone.

## Test Layers

### Unit

- validates local logic, data transformation, and component behavior
- should be fast and deterministic

### Contract

- validates API request and response shape
- protects integration boundaries from drift

### Integration

- validates collaboration between modules, services, or adapters
- should cover important runtime and configuration paths

### End-To-End

- validates critical user journeys and business workflows
- should focus on high-value paths, not every permutation

## Minimum Expectations

- frontend behavior changes should typically include unit and or UI-level coverage
- backend contract changes should include contract or integration coverage
- cross-system business flows should include end-to-end coverage where feasible
- bug fixes should add regression tests unless there is a documented reason not to

## Ownership

- Test Manager defines coverage expectations
- Automation Tester implements cross-layer automation
- implementation roles contribute tests closest to their code

## Validation Rule

If an acceptance criterion cannot be validated, the feature is not ready to close.
