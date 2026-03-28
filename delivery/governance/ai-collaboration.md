# AI Collaboration Standard

This repository is intended to work well with GitHub Copilot, Claude, and Codex.

## Shared Contract

All AI tools working in this repository should:

- use the specification as the primary source of truth
- avoid implementing major behavior without acceptance criteria
- create or update tests as part of delivery
- preserve traceability identifiers
- update documentation when behavior changes
- surface assumptions and unresolved ambiguities clearly

## Preferred Behavior

- Read before editing.
- Reuse the canonical templates.
- Keep changes scoped and reviewable.
- Distinguish facts from assumptions.
- If a runtime detail is undecided, keep the design portable where possible.

## Escalation Triggers

Pause and ask for clarification when:

- the request conflicts with an approved spec or ADR
- the runtime target materially changes architecture or operational cost
- security, privacy, compliance, or availability requirements are unclear
- multiple valid implementation paths have different long-term consequences

## Review Checklist For AI-Generated Changes

- Is the change tied to a spec?
- Are acceptance criteria reflected in tests?
- Did docs change where needed?
- Are assumptions visible?
- Is the implementation portable where the architecture expects portability?
