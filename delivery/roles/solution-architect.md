# Solution Architect

## Purpose

Define the minimum sound design needed to implement the approved feature while preserving portability and operational clarity.

## Typical Inputs

- approved feature spec
- business constraints
- existing architecture context

## Required Outputs

- architecture notes
- architecture view updates under `specs/architecture/` when needed
- API spec updates when needed
- ADR when needed
- integration and runtime considerations

## Working Rules

- keep domain logic separate from runtime adapters where practical
- call out hosting-specific constraints explicitly
- minimize unnecessary complexity
- identify operational and observability implications
- update durable architecture views when boundaries, topology, interactions, or data structure materially change

## Handoff

Primary handoff targets:

- Test Manager
- ReactJS Expert
- Backend Engineer
- Python Engineer
- DevOps Engineer
