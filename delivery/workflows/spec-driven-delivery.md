# Spec-Driven Delivery Workflow

This repository uses a spec-driven workflow so that human contributors and AI tools follow the same lifecycle.

## Core Principle

Every meaningful implementation change should be traceable back to an approved specification and forward to tests and validation evidence.

Use [AI Working Contract](../governance/ai-working-contract.md) as the shared cross-agent minimum behavior layer for Copilot, Codex, and Claude.

## High-Level Request Policy

A short high-level request is valid input for this workflow.

AI tools should treat a plain-language request as enough to begin orchestration, refinement, and minimum artifact creation. They should not require the requester to pre-write a full technical specification before work can start.

Treat short product-language requests such as "I would like...", "add a page...", "show...", or "create a submenu..." as intake for refinement by default, not as implicit approval to skip directly to implementation.

## Request Classification

Before implementation, classify the request as one of:

- feature
- UI standardization
- backend or platform change
- bug fix
- docs-only
- trivial change

Requests in the first four categories should normally follow the spec-first flow. UI standardization, reusable component harmonization, and layout consistency work count as feature-like delivery work.

## Minimum Artifact Policy

When a request is feature-like, first search for an existing governing feature package for the same shipped capability. If no adequate governing package exists, create or update a feature package under `specs/features/FEAT-<area>-<id>-<short-name>/`.

Use the minimum artifact set and "add only when needed" rules from [AI Working Contract](../governance/ai-working-contract.md).
When later work materially evolves an existing shipped feature, keep the governing `FEAT-...` package current rather than creating a disconnected replacement unless the work is genuinely separate. Use the spec-maintenance rule in [AI Working Contract](../governance/ai-working-contract.md).

Use the artifact-enrichment rule from [AI Working Contract](../governance/ai-working-contract.md) when drafting these files:

- enrich the existing artifacts with stronger actors, flows, business rules, domain/data language, and non-functional expectations when that improves clarity
- do not create a parallel mandatory artifact set just because another method or prompt uses terms such as requirements, use cases, or entity models
- keep optional visual clarification inside the existing artifact set unless the workflow explicitly calls for a separate artifact

Still add these supporting artifacts when they are warranted:

- updates under `specs/architecture/` when the feature materially changes durable architecture views
- `research.md` when a non-trivial technology or approach decision requires investigation before committing to a plan

## Good Enough To Implement

Implementation may begin once the governing artifacts are complete enough to capture:

- scope
- assumptions
- constraints
- affected surfaces
- acceptance criteria or equivalent success conditions
- constitution alignment confirmed (no unresolved conflicts with `delivery/governance/constitution.md`)

Solution choices should appear in the refinement or feature-spec layer before they are treated as implementation commitments.

After creating or materially refining a new feature package, follow the implementation-transition rule from [AI Working Contract](../governance/ai-working-contract.md).

When a solution choice materially affects the system beyond a single feature, update the relevant durable architecture view under `specs/architecture/` as needed.

## Trivial Change Exemption

The full feature-package flow may be skipped only for clearly low-risk changes such as:

- typo fixes
- copy-only edits
- isolated non-behavioral refactors
- mechanical config changes
- narrow test-only changes

When using this exemption, the AI tool should say so explicitly.

## Delivery Lifecycle

1. Intake
   - Capture the user need, business problem, constraints, and desired outcomes.
   - Classify the request before implementation starts.
   - Treat outcome-oriented product requests as refinement intake unless the user also explicitly asks to implement now.
   - If the request is feature-like and the governing feature package is missing or stale, create or update the minimum artifact set first.
2. Specification
   - Produce or update the governing feature artifacts using the canonical templates.
   - Include scope, non-scope, assumptions, constraints, requirements, edge cases, and acceptance criteria.
   - Strengthen the content with actors, outcomes, non-functional expectations, main and alternative flows, failure paths, business rules, and domain/data considerations when those improve implementation clarity.
3. Design
   - Produce supporting artifacts as needed:
   - API spec
   - architecture view updates under `specs/architecture/`
   - UX notes
   - ADRs
   - non-functional requirements
   - research when a technology or approach decision requires investigation before the plan can be committed
   - All research findings must include a constitution alignment check before the recommended option is adopted
4. Test Design
   - Convert acceptance criteria into test scenarios.
   - Define the required test layers: unit, contract, integration, end-to-end, and non-functional where relevant.
5. Task Breakdown
   - Break the work into implementation tasks linked back to spec identifiers.
6. Implementation
   - Update frontend, backend, infrastructure, and docs as required.
   - Keep interfaces aligned with the specs and ADRs.
7. Validation
   - Execute manual and automated validation.
   - Produce a validation report that references passing and failing checks.
8. Review And Merge
   - Verify traceability, standards compliance, and documentation completeness.
9. Feedback Integration
   - After a feature is live, route production signals back into the governing specification.
   - When later changes materially affect the same feature, update the existing governing `FEAT-...` package so the spec remains anchored to the delivered behavior.
   - Performance bottlenecks observed in production become non-functional requirements on the feature spec.
   - Security vulnerabilities or incidents become constraints on future work and must update the relevant spec or ADR.
   - Recurring user-reported issues become open questions or requirement amendments on the feature spec.
   - The validation report should be updated with post-release findings when they are material.
   - This phase is optional for low-risk features and mandatory for any feature that generated a production incident.

## Done Criteria

A feature is done only when all of the following are true:

- the feature specification is complete enough to implement
- architecture decisions are documented when needed
- durable architecture views are updated when the feature materially changes them
- acceptance criteria are testable
- automated tests exist at the appropriate layers
- implementation matches the spec or the spec was updated intentionally
- documentation reflects the delivered behavior
- validation evidence is recorded

## Artifact Map

- Constitution: non-negotiable governing principles all work must respect
- Feature spec: business and functional source of truth
- API spec: interface contract source of truth
- Architecture views: durable system, container, component, deployment, dynamic, and data structure references
- ADR: design rationale for significant technical choices
- Research: technology investigation and trade-off analysis before plan commitment
- Test plan: expected coverage and validation strategy
- Task breakdown: implementation sequencing and ownership (with parallelization markers)
- Validation report: evidence of what was verified, updated post-release when material

## Optional Diagram Guidance

Use a lightweight interaction or use-case diagram only when it clarifies the feature better than prose alone.

Good candidates include:

- multi-actor behavior
- materially branching workflows
- role-sensitive or authorization-sensitive interaction paths
- navigation-heavy features where user movement is central to the change

Do not make such diagrams mandatory for simple CRUD, small page enhancements, isolated backend changes, or straightforward bug fixes. Prefer embedding the diagram inside `feature-spec.md` or `spec-refinement.md` instead of creating a separate default artifact.

## Preferred Working Sequence For AI Tools

When an AI tool is asked to deliver a feature, it should:

1. Classify the request.
2. Read `delivery/governance/constitution.md` and confirm the proposed approach does not conflict with any article.
3. Create or update the governing feature package if the request is feature-like.
4. Read the relevant feature artifacts and related standards.
5. Identify missing details and record assumptions.
6. Produce a `research.md` if a non-trivial technology or approach decision is unresolved.
7. Derive acceptance criteria and tests.
8. Implement the smallest correct change set, marking parallel tasks `[P]` in the task breakdown.
9. Update docs and validation artifacts before closing the task.
