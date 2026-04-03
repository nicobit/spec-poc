# Feature: Client Management

Feature ID: FEAT-CLIENTS-001

Status: Draft

## Summary

Introduce a Client Management capability that promotes `Client` from a free-form label to a first-class shared business entity. The feature should provide the minimum client identity and management model required to support environments and schedules now, while enabling future reuse by cloud cost, incidents, and problems.

## Goals

- Define a canonical client identity for reuse across features
- Provide a minimum manageable client record
- Allow the environments domain to reference a stable client entity instead of only a string label
- Establish a clean foundation for future client-scoped reporting and operational features

## Non-Goals

- Deliver full cost-management, incident-management, or problem-management workflows
- Model complex organization/account hierarchies in the first iteration
- Build a large customer-administration platform in the first release
- Support group-based client-admin ownership in the first release
- Support hard delete of clients in the first release

## Users And Roles

- `Admin`
  - create, update, and retire client records
- `EnvironmentManager`
  - create, update, view, and retire client records
  - use client records when managing environments and schedules
- `ClientAdmin`
  - user-based ownership designation stored on the client record for client-scoped governance and future reuse

## Functional Requirements

### REQ-CLIENT-001 Canonical client entity

The system shall define `Client` as a first-class domain entity with stable identity, rather than relying only on free-form client labels attached to other records.

### REQ-CLIENT-002 Minimum client record

The system shall support a minimum maintainable client record that is sufficient for shared reuse across the platform.

The initial client record shall at minimum support:

- stable client identifier
- display name
- short code
- country
- timezone
- client-admin ownership

### REQ-CLIENT-003 Client management capability

The system shall provide an initial management capability that allows authorized users to list, create, view, and update client records.

### REQ-CLIENT-003A Client-admin ownership

The system shall allow the client record to maintain client-admin ownership metadata so future client-scoped authorization and governance can reuse the same source of truth.

The first release shall support user-only client-admin ownership assignments expressed as valid email addresses.

### REQ-CLIENT-004 Shared reference model

The environments and schedules domains shall be able to reference the canonical client identity rather than depending only on mutable display text.

### REQ-CLIENT-005 Compatibility handling

The system shall define a lightweight compatibility approach for current records or flows that still use a client string so the introduction of canonical client identity does not create silent inconsistency during early delivery.

### REQ-CLIENT-006 Reuse across future domains

The client model shall be defined so future domains such as cost, incidents, and problems can reference it without creating parallel client concepts.

### REQ-CLIENT-007 Authorization

The system shall restrict client create/update/retire operations to authorized administrative roles.

### REQ-CLIENT-008 Dedicated client area

The system shall provide a dedicated `Clients` area in the application so client records are managed as a first-class business capability rather than as a hidden supporting configuration.

### REQ-CLIENT-009 Logical retirement

The first release shall support logical retirement of client records instead of hard delete.

Retired clients shall remain traceable for linked environments, schedules, and future historical reporting.

### REQ-CLIENT-010 Reset-first rollout

The first rollout shall assume that early-stage content can be reset and recreated in canonical form rather than requiring a heavy migration program for string-based client references.

During rollout:

- new, recreated, or updated records shall use canonical `clientId` for linkage
- seed or disposable early-stage records may be replaced instead of migrated
- any temporary label-based compatibility kept in implementation shall remain lightweight and explicitly transitional
- the system shall not silently guess ambiguous client bindings

## UX Requirements

- The initial client-management experience should stay intentionally lightweight
- The first UI shall be a dedicated `Clients` area
- The preferred first-release navigation placement is a top-level `Clients` entry separate from `Environments`
- Users should be able to understand that `Client` is the parent business context for environments
- The first UI should focus on clarity of identity and maintainability rather than deep client-specific workflows
- Naming should use `Client` as a business entity, not a technical label
- Country and timezone should be displayed and edited as first-class client attributes rather than hidden technical metadata
- Retirement should be presented as a deliberate administrative action, clearly distinct from deletion

## Data And Domain Requirements

- `Client` shall have a stable canonical identifier
- Human-readable client labels shall be treated as display and lookup values, not the sole source of truth
- Related features should progressively align to the canonical client identity
- The first-release client record shall include short code, country, timezone, and client-admin ownership as managed attributes
- Client-admin ownership shall support explicit user assignments in the first release
- Client retirement shall be modeled logically rather than through hard deletion in the first release

## Acceptance Criteria

- A governing client-management feature exists and defines `Client` as a first-class shared entity
- The minimum client record is explicitly described
- The minimum first-release client record explicitly includes short code, country, timezone, and client-admin ownership
- The feature spec clarifies how clients relate to environments and schedules
- The feature spec makes clear that future domains such as cost, incidents, and problems are expected to reuse the same client model rather than inventing their own
- Reset-first rollout expectations for current string-based client references are explicitly documented
- The feature spec explicitly defines a dedicated `Clients` area, user-only client-admin ownership, and logical retirement for the first release

## Risks And Dependencies

- Current environments and schedules still use client labels in parts of the implementation, so canonical `clientId` alignment must continue until reset/recreated data is complete
- Future domains may require more client metadata than the first iteration should expose
- Navigation and information architecture decisions for a dedicated `Clients` area should remain coherent with the existing `Environments` area

## Open Questions

- How should future client-scoped capabilities such as cost, incidents, and problems relate to the top-level `Clients` area once they exist?

## Assumptions

- `Client` should be treated as a foundational shared domain object
- The first release should be intentionally narrow
- The environments feature remains the first major consumer of the client-management capability
