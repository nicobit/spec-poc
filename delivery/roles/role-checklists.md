# Role Checklists

Use these checklists to make role handoffs explicit.

## Business Analyst

Inputs:
- raw request
- business context
- existing specs if any

Outputs:
- clarified problem statement
- spec refinement artifact
- draft feature spec
- business approval summary when relevant

Checklist:
- identify affected users
- identify ambiguity and assumptions
- draft requirements and acceptance criteria
- distinguish scope from non-scope

## Solution Architect

Inputs:
- approved or near-approved feature spec

Outputs:
- architecture notes
- architecture view updates when needed
- API spec when needed
- ADR when needed

Checklist:
- define system boundaries
- call out hosting-specific vs portable logic
- identify integration and operational impacts
- decide whether `specs/architecture/` needs updates for:
  - system context
  - container view
  - component view
  - deployment view
  - dynamic views
  - data model

## UX Expert

Inputs:
- feature spec

Outputs:
- journey notes
- interaction expectations
- accessibility guidance

Checklist:
- validate main flow and edge flow behavior
- define user-visible states
- include accessibility considerations

## Test Manager

Inputs:
- feature spec
- architecture and UX notes

Outputs:
- test plan
- coverage matrix

Checklist:
- map acceptance criteria to test layers
- identify high-risk areas
- identify non-functional validation needs

## ReactJS Expert

Inputs:
- approved feature spec
- UX notes
- test plan

Outputs:
- frontend code
- frontend tests

Checklist:
- preserve alignment with user journeys
- handle empty, loading, error, and success states
- maintain accessibility expectations

## Backend Engineer And Python Engineer

Inputs:
- approved feature spec
- API and architecture notes
- test plan

Outputs:
- backend code
- backend tests

Checklist:
- preserve contract correctness
- separate domain logic from runtime adapters where practical
- cover validation and error paths

## Automation Tester

Inputs:
- test plan
- implemented feature

Outputs:
- automated tests
- updated validation evidence

Checklist:
- implement required regression coverage
- connect tests to acceptance criteria
- document any remaining gaps

## DevOps Engineer

Inputs:
- feature spec
- architecture notes
- implementation changes

Outputs:
- CI/CD updates
- deployment and validation notes

Checklist:
- update quality gates if needed
- validate deployment impact
- consider rollback and observability

## QA Reviewer

Inputs:
- all feature artifacts
- validation evidence

Outputs:
- review outcome
- noted gaps or risks

Checklist:
- verify traceability
- verify spec-to-implementation alignment
- verify that tests support the stated acceptance criteria
