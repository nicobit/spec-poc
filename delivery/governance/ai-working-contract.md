# AI Working Contract

This document defines the shared minimum working contract for GitHub Copilot, Codex, and Claude in this repository.

Keep this contract lean. Tool-specific instruction files should point to it instead of restating repository policy in different ways.

## Core Expectations

All AI tools should:

- treat repository specifications as the primary source of truth
- classify incoming requests before implementing code
- preserve traceability between request, specification, tests, implementation, and validation
- make assumptions and unresolved ambiguity explicit
- keep changes small, reviewable, and aligned with existing repository standards

For Python backend delivery specifically:

- keep runtime entrypoints and trigger adapters thin; they should primarily compose request handling, auth, and response wiring
- extract request models, shared helpers, route groups, and domain logic into neighboring modules or shared packages when a single file starts carrying multiple responsibilities
- prefer feature-local package organization for non-trivial backend areas instead of growing a single `__init__.py` or monolithic handler file indefinitely
- avoid mixing request parsing, storage orchestration, business rules, and route registration in one oversized module when those concerns can be separated cleanly
- run at least a lightweight Python validation step after edits such as import/syntax compilation, targeted tests, or repository-standard quality checks when available

## Feature-Like Work

Treat these as feature-like by default:

- new product capabilities
- UI standardization or reusable UI harmonization
- backend or platform behavior changes
- changes that affect more than a trivial surface

For feature-like work:

1. Search for an existing governing `specs/features/FEAT-<area>-<id>-<short-name>/` package for the same shipped capability.
2. Update the existing governing package by default when the same feature is still materially evolving.
3. Create a new governing feature package under `specs/features/FEAT-<area>-<id>-<short-name>/` only when the new work is meaningfully separate in scope, ownership, or user-facing capability.
4. Start with the minimum package:
   - `business-request.md`
   - `spec-refinement.md`
   - `feature-spec.md`
5. Add `validation-report.md` when implementation or validation begins, and keep it current through closure.
6. Add extra artifacts only when they are needed:
   - `api-spec.md` when contracts, validation rules, compatibility expectations, or authorization behavior change materially
   - `test-plan.md` when behavior is materially non-trivial, integration-heavy, role-sensitive, or edge-case-heavy
   - `task-breakdown.md` when sequencing or coordination needs to be explicit
   - `adr.md` when a meaningful cross-cutting design decision should be recorded
   - `business-approval-summary.md` only when explicit business approval capture is needed

Do not stop at only `business-request.md` and `feature-spec.md` by default unless the user explicitly asks for a lighter draft.

## Artifact Enrichment Policy

The repository may borrow useful content patterns from requirements analysis, use-case specification, domain/entity modeling, and lightweight use-case diagrams, but these should enrich the existing artifacts rather than create a second workflow.

- Keep the core feature package centered on `business-request.md`, `spec-refinement.md`, and `feature-spec.md`.
- Use requirements-style thinking to improve actors, outcomes, constraints, and non-functional expectations inside `business-request.md`.
- Use use-case-style thinking to improve preconditions, main flow, alternative flows, failure paths, and business rules inside `spec-refinement.md` and, when relevant, `feature-spec.md`.
- Use entity-model thinking selectively to improve domain terms, data requirements, relationships, validation, and invariants when the feature is data-rich or lifecycle-heavy.
- Do not introduce separate mandatory user-facing artifacts such as standalone requirements catalogs, use-case documents, or entity-model files unless the repository workflow is intentionally changed.
- Optional diagrams should live inside an existing artifact when they clarify the behavior better than prose alone.

## Spec Maintenance Over Time

Treat an existing `specs/features/FEAT-<area>-<id>-<short-name>/` package as the governing specification while that feature is still materially evolving.

- Update the existing package when later work materially extends, alters, or constrains the same shipped feature.
- Create a new `FEAT-...` package only when the new work is meaningfully separate in scope, ownership, or user-facing capability.
- Small bug fixes may stay on the lighter path unless they materially change user-visible behavior, contracts, authorization, or durable architecture.

Examples:

- Add a new scheduling rule to an existing environments feature -> update the existing `FEAT-...` package.
- Fix a typo in a page title -> use the trivial-change exemption.
- Fix an authorization bug in an existing API -> update the existing `FEAT-...` package and add `api-spec.md` if the contract or auth behavior changes materially.
- Add a new dashboard capability unrelated to existing features -> create a new `FEAT-...` package.

## Artifact Decision Table

| Situation | Add |
|---|---|
| New feature-like request | `business-request.md`, `spec-refinement.md`, `feature-spec.md` |
| Implementation or validation begins | `validation-report.md` |
| Request/response shape, validation rules, compatibility, or authorization changes materially | `api-spec.md` |
| Behavior is materially non-trivial, integration-heavy, role-sensitive, or edge-case-heavy | `test-plan.md` |
| Sequencing or coordination needs to be explicit | `task-breakdown.md` |
| A meaningful cross-cutting design decision should be recorded | `adr.md` |
| Explicit business approval must be captured | `business-approval-summary.md` |

## Transition To Implementation

After creating or materially refining a new feature package, implementation should normally pause unless one of these is true:

- the user explicitly asked to proceed
- the request clearly implies implementation now
- the work is a trivial-change exemption

Interpret intent conservatively:

- Short product-language requests such as "I would like...", "please add...", "show a page...", "create a submenu...", or similar outcome-oriented phrasing count as raw feature intake by default, not as approval to skip spec refinement.
- "Clearly implies implementation now" means the user has directly asked to build, implement, or proceed now, or the surrounding context makes immediate delivery unambiguous.
- Even when implementation now is clearly requested, feature-like work must still create or update the governing feature package before code is written in that turn.

Implementation may begin once scope, assumptions, constraints, affected surfaces, and acceptance criteria are explicit enough to implement safely.

Acceptance criteria do not need to use BDD/Gherkin by default. Use concise plain acceptance criteria unless scenario-style `Given / When / Then` wording improves clarity for user-visible, role-sensitive, or stateful behavior.

## Clarifying Questions

Ask a clarifying question only when:

- there is a meaningful product or design choice with different outcomes
- the requested action is destructive, risky, or expensive
- the agent cannot safely infer the path from the request and current specifications

Otherwise, make a reasonable assumption and state it explicitly.

## Trivial-Change Exemption

The full feature-package flow may be skipped only for clearly low-risk work such as:

- typo fixes
- copy-only edits
- isolated non-behavioral refactors
- mechanical config edits
- narrow test-only changes

When using this exemption, say so explicitly.
