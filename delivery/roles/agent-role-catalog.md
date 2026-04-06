# Agent Role Catalog

This catalog defines the main roles that may collaborate on spec-driven delivery. A single human or AI tool may play multiple roles, but the responsibilities should stay explicit.

## Core Delivery Roles

### Product Owner

- clarifies business outcomes, scope, and priorities
- approves what problem is worth solving now
- confirms business acceptance criteria

### Business Analyst

- refines raw user requests into structured specifications
- identifies ambiguities, dependencies, assumptions, and edge cases
- maintains requirement quality and traceability

### Solution Architect

- defines system boundaries, component responsibilities, and integration patterns
- decides when ADRs are required
- keeps the solution portable across target Azure hosting models where intended

### UX Expert

- defines user journeys, flows, usability expectations, and accessibility considerations
- ensures the experience supports the business intent, not just the happy path

### ReactJS Expert

- implements and reviews frontend behavior in `frontend/`
- aligns UI behavior to specs, UX guidance, and frontend standards

### Backend Engineer

- implements backend contracts and domain behavior in `backend/`
- keeps business logic separated from hosting and trigger concerns

### Python Engineer

- owns Python-specific implementation quality, packaging, maintainability, and testing where backend services use Python

### Test Manager

- defines the test strategy for a feature or release
- ensures acceptance criteria are testable and properly covered
- identifies risk-based testing priorities and gaps

### Automation Tester

- implements automated tests across unit, contract, integration, and end-to-end layers
- creates regression tests for defects and critical paths

### DevOps Engineer

- defines and maintains CI/CD pipelines
- ensures builds, tests, quality gates, packaging, deployment, and rollback paths are reliable
- aligns deployment automation with architecture and environment strategy

## Supporting Governance Roles

### Enhancement Scout

- optionally reviews the project for worthwhile feature opportunities, UX gaps, and enhancement candidates before formal spec drafting begins
- produces lightweight, ranked recommendations grounded in repository context
- identifies whether a recommendation likely extends an existing `FEAT-...` package
- does not replace the normal spec-driven delivery flow once an opportunity is chosen

### Security Reviewer

- reviews authentication, authorization, secrets handling, data exposure, and threat surfaces

### Documentation Owner

- updates technical, operational, and contributor documentation
- ensures delivered behavior is reflected in repo guidance

### QA Reviewer

- performs independent quality review of spec, implementation, and validation evidence

### Prompt And Agent Engineer

- maintains prompts, instructions, templates, skills, and role orchestration for AI-assisted delivery

## Role Handoffs

The normal handoff flow is:

1. Product Owner -> Business Analyst
2. Business Analyst -> Architect and UX Expert
3. Architect and UX Expert -> Test Manager
4. Test Manager -> ReactJS Expert, Backend Engineer, Python Engineer, Automation Tester
5. DevOps Engineer prepares or updates CI/CD as needed
6. QA Reviewer and Documentation Owner validate closure

## Minimum Roles For Most Features

Most features should explicitly account for at least:

- Business Analyst
- Solution Architect
- UX Expert when UI changes
- ReactJS Expert and or Backend Engineer
- Test Manager
- Automation Tester
- DevOps Engineer when build, environment, or deployment changes are involved
