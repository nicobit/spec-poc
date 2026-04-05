# Spec-Driven Guide For Teams

Use this guide when you want to work with AI in this repository without learning the whole framework first.

## The Short Version

For most requests, do this:

1. Give the AI tool the idea or change request.
2. Ask it to find or create the right feature package under `specs/features/`.
3. Ask it to draft the spec first, not code first.
4. Review the draft.
5. Ask it to implement only when the spec looks right.
6. Review the tests, docs, and validation report before closing.

## What To Say To The AI Tool

Use simple prompts like these:

- `Use the Feature Orchestrator and draft the spec for this request. Do not implement yet.`
- `Find the existing FEAT package for this request and update it.`
- `Create the minimum feature package for this idea, but stop before implementation.`
- `Proceed with implementation now that the spec is reviewed.`

## What The AI Tool Should Create First

For normal feature-like work, the AI tool should usually create or update:

- `business-request.md`
- `spec-refinement.md`
- `feature-spec.md`

You review these first.

## When To Ask For Implementation

Ask the AI tool to implement only when the feature is clear enough.

That usually means the spec now shows:

- what is in scope
- what is out of scope
- the main assumptions
- the acceptance criteria

## When Extra Documents Are Needed

The AI tool should only add extra artifacts when the change really needs them.

Common examples:

- `api-spec.md` when API shape, validation, compatibility, or authorization changes
- `test-plan.md` when the behavior is non-trivial or risk-heavy
- `task-breakdown.md` when the work needs explicit sequencing
- `adr.md` when there is an important design decision
- `validation-report.md` once implementation or validation starts

## If The Request Is Small

For a typo, a small copy fix, or another clearly low-risk change, the AI tool may use a lighter path instead of creating a full feature package.

If that happens, just confirm that the lighter path makes sense.

## Start Here

If you are new to this repo, use this order:

1. [Start From Idea](start-from-idea.md)
2. [Quickstart](quickstart.md)
3. [Worked Examples](examples/README.md)
4. [Contributor Workflow](../contribution/contributor-workflow.md)

If you later need the full rules, use:

- [AI Working Contract](../../delivery/governance/ai-working-contract.md)
- [Spec-Driven Delivery](../../delivery/workflows/spec-driven-delivery.md)
- [Business To Spec Workflow](../../delivery/workflows/business-to-spec-workflow.md)

## Existing Feature Packages

These are the main feature packages already in the repo:

- [FEAT-ENVIRONMENTS-001-management](../../specs/features/FEAT-ENVIRONMENTS-001-management/README.md)
- [FEAT-ENVIRONMENTS-002-dashboard](../../specs/features/FEAT-ENVIRONMENTS-002-dashboard/feature-spec.md)
- [FEAT-CLIENTS-001-management](../../specs/features/FEAT-CLIENTS-001-management/feature-spec.md)
- [FEAT-EXECUTION-001-start-stop-services](../../specs/features/FEAT-EXECUTION-001-start-stop-services/feature-spec.md)
- [FEAT-ASSISTANT-001-panel](../../specs/features/FEAT-ASSISTANT-001-panel/feature-spec.md)
- [FEAT-ASSISTANT-002-ai-chat-schedules](../../specs/features/FEAT-ASSISTANT-002-ai-chat-schedules/feature-spec.md)

If you are not sure where a request belongs, ask the AI tool to choose the closest existing package or create a new one only if the work is genuinely separate.
