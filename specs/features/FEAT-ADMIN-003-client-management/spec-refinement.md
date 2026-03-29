# Spec Refinement

## Refined Problem

`Client` is already acting like a shared business concept, but the system does not yet treat it as a managed domain object. Today it is mostly passed around as a string on environment and schedule records. That is acceptable for isolated features, but it will not scale cleanly as more capabilities need to organize, authorize, aggregate, and report by client.

If `Client` remains only a label, the product risks inconsistent naming, fragile joins, duplicated configuration concepts, and weaker traceability across future domains such as cost, incidents, and problems.

## Clarified Scope

- Define a first iteration of `Client Management` as a reusable domain capability
- Establish `Client` as a first-class shared entity with stable identity
- Define the minimum editable client metadata needed to support:
  - environment ownership
  - schedule ownership/context
  - future reporting and cross-domain linkage
- Treat the first-release client record as explicitly containing:
  - `clientId`
  - display name
  - short code
  - country
  - timezone
  - client-admin ownership
- Define the initial management experience for clients
- Clarify how existing environment and schedule flows should reference the client entity

## Information Architecture Direction

- The intended business hierarchy remains:
  - `Client`
  - `Environment`
  - `Stage`
  - `Schedule`
- `Client` should become a configurable parent business object, not only a display label
- `Environment` remains the operational container underneath a client
- Other future capabilities should be able to anchor themselves to the same client context

## Initial Capability Direction

- The first client-management iteration should remain intentionally small
- The first user-facing delivery should be a dedicated `Clients` area
- The initial user-facing capability should focus on:
  - client list
  - client create/edit
  - basic client metadata
  - client-admin ownership
  - logical retirement
- It should not try to solve all future cost, incident, or problem workflows in the first release

## Clarified Scope Boundaries

### In Scope

- Canonical client identity
- Minimum client attributes
- Dedicated client management entry point and basic CRUD/retirement expectations
- User-only client-admin ownership in the first release
- Client reuse guidance for environments and schedules
- Traceability and future extensibility expectations

### Out of Scope

- Full client onboarding workflow
- Customer billing/invoicing
- Enterprise account hierarchy
- Group-based client-admin ownership in the first release
- Hard delete of client records in the first release
- Deep integrations with external customer systems
- Full client-scoped dashboards in the first iteration

## Assumptions

- A stable client identity is more important than preserving today's free-form string-only model
- The initial implementation can remain lightweight and does not need a large client admin area
- Environments and schedules are the first consumers of the client entity, but not the last
- Existing role concepts such as `admin` and `client-admin` are likely to remain relevant once client records become first-class
- Country and timezone are useful shared metadata because future schedules, reporting, and incident/problem workflows may need them without redefining client context later
- Logical retirement is safer than hard delete because future linked domains such as cost, incidents, and problems will benefit from durable client traceability
- The current delivery phase can reset and recreate seed or early-stage content, so a complex migration program is not required for the first rollout

## Open Questions

- How should the dedicated `Clients` area be placed in the main navigation relative to `Environments` and other future client-scoped capabilities?

## Derived Requirements

- Define `Client` as a canonical shared domain entity
- Ensure environments and schedules can reference the canonical client identity
- Provide a minimum maintainable client-management capability
- Use a dedicated `Clients` area for the first management experience
- Restrict first-release client-admin ownership to explicit user assignments
- Use logical retirement instead of hard delete
- Avoid creating duplicate client concepts in future features
- Require new and recreated records to use canonical `clientId`

## Recommended Design Direction

- Introduce a canonical `Client` domain model with stable identity and a small set of shared metadata
- Standardize the first-release client record around stable identity, display name, short code, country, timezone, and client-admin ownership
- Use a dedicated `Clients` area for the first user-facing management experience
- Use user-only client-admin ownership in the first release
- Use logical retirement instead of hard delete in the first release
- Reset and recreate early-stage or seed records in canonical form rather than introducing a heavy one-time migration program
- Use lightweight compatibility handling only where it keeps development and test flows practical
- Require new, recreated, or updated records to use canonical `clientId`
- Keep the initial client-management UI intentionally narrow and administrative
- Treat `Client` as foundational shared data for future domains rather than a feature-specific helper object
- Avoid overloading the first version with downstream capabilities like cost or incidents; instead, design the model so those features can reuse it later
