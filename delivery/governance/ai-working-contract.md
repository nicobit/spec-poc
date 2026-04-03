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

## Feature-Like Work

Treat these as feature-like by default:

- new product capabilities
- UI standardization or reusable UI harmonization
- backend or platform behavior changes
- changes that affect more than a trivial surface

For feature-like work:

1. Create or update the governing feature package under `specs/features/FEAT-<area>-<id>-<short-name>/`.
2. Start with the minimum package:
   - `business-request.md`
   - `spec-refinement.md`
   - `feature-spec.md`
3. Add `validation-report.md` when implementation or validation begins, and keep it current through closure.
4. Add extra artifacts only when they are needed:
   - `api-spec.md` when contracts, validation rules, compatibility expectations, or authorization behavior change materially
   - `test-plan.md` when behavior is materially non-trivial, integration-heavy, role-sensitive, or edge-case-heavy
   - `task-breakdown.md` when sequencing or coordination needs to be explicit
   - `adr.md` when a meaningful cross-cutting design decision should be recorded
   - `business-approval-summary.md` only when explicit business approval capture is needed

Do not stop at only `business-request.md` and `feature-spec.md` by default unless the user explicitly asks for a lighter draft.

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
