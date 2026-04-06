# Business To Spec Workflow

This workflow is for requests that start from a business user, product stakeholder, or non-technical requester.

## Goal

Turn a plain-language request into an implementation-ready specification without expecting the requester to describe technical design, APIs, architecture, or tests.

An optional discovery-oriented step may happen before this workflow when the user asks for enhancement ideas, project improvement opportunities, or feature gap analysis. That discovery step is advisory only and does not replace the normal specification flow once an opportunity is selected.

## Core Principle

Business users describe the problem and the desired outcome. The repository process translates that into delivery artifacts.

High-level requests are sufficient input to start this process. The business requester is not expected to describe components, page layouts, APIs, architecture, or test structure.

## Recommended Flow

1. Business Request Intake
   - The requester may provide a short plain-language request or use the business request template.
   - The focus is on goals, users, pain points, examples, and success outcomes.
2. Business Analysis
   - The Business Analyst role refines the request.
   - Ambiguities, assumptions, dependencies, and missing information are captured.
3. Specification Drafting
   - The refined request is transformed into the minimum governing artifact set.
   - Start with `business-request.md`, `spec-refinement.md`, and `feature-spec.md`.
   - Add `test-plan.md`, `api-spec.md`, `adr.md`, or `task-breakdown.md` only when they are needed.
   - Enrich those artifacts with stronger actors, outcomes, flows, business rules, domain/data notes, and non-functional expectations when that improves clarity.
   - Do not create extra default user-facing artifacts just because a supporting method uses labels such as requirements, use case, or entity model.
   - Initial acceptance criteria are produced.
4. Business Review
   - The requester reviews the refined scope, expected behavior, and acceptance criteria.
   - Implementation does not begin until the business intent is confirmed.
   - Treat short requests such as "I would like...", "add a page...", or "show all events..." as business intent input, not as implicit approval to skip refinement and start coding.
5. Solution Design
   - Architect, UX, Test, Engineering, and DevOps roles derive their artifacts from the approved specification.
6. Implementation And Validation
   - The feature is implemented, tested, documented, and validated using the standard delivery workflow.

## Business User Responsibilities

The business requester should provide:

- the problem they want solved
- who is affected
- why it matters
- what success looks like
- examples of expected outcomes
- any timing, policy, or operational constraints they know

The business requester is not expected to provide:

- solution architecture
- API design
- database design
- test automation details
- deployment strategy

## Approval Gates

Use these checkpoints to avoid implementing the wrong thing.

### Gate 1: Request Clarity

The request is clear enough to refine when:

- the business problem is understandable
- the target user is known
- the desired outcome is known

### Gate 2: Specification Approval

The specification is approved when:

- scope and non-scope are understood
- user flows make sense
- acceptance criteria are understandable and testable
- assumptions are visible

### Gate 3: Delivery Readiness

Implementation can start when:

- the feature spec is approved
- critical open questions are resolved
- test approach is defined

## Recommended AI Starting Role

For business-originated requests, the first active role should be `Business Analyst`.

The Business Analyst should:

1. restate the request in structured terms
2. identify ambiguities and assumptions
3. produce the first minimum artifact draft with enough structure to capture actors, outcomes, constraints, and main flows
4. prepare the approval summary for the business requester

Only after that should implementation roles begin work.

Signals that do not, by themselves, authorize implementation:

- "I would like..."
- "Add a page for..."
- "Show ..."
- "Create a submenu ..."

These phrases describe desired outcomes. They should trigger refinement first unless the requester also explicitly asks to implement now.

## Optional Diagram Use

When the request involves multiple actors, branching workflows, role-sensitive behavior, or navigation-heavy interaction, a lightweight embedded diagram may be added to the refinement or feature-spec artifact to improve understanding.

Do not require diagrams for every request, and do not create a separate diagram artifact by default.
