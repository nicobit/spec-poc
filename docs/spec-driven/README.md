# Spec-Driven Guide For Teams

Use this section when you want to start work quickly with AI support and follow the repository approach without reading the full delivery framework first.

This is the team-facing guide. It explains what you ask the AI tool to do, what you review, and when you ask it to proceed.

## What You Usually Do

For most work, your path is:

1. read the request
2. decide whether it is a new feature, an enhancement, a bug fix, or a trivial change
3. ask the AI tool to find or create the governing feature package under `specs/features/`
4. review the created or updated artifacts
5. adjust them if needed, either yourself or through the AI tool
6. ask the AI tool to implement only after the feature is clear enough
7. review the tests, docs, and validation evidence

## Start Here

If you are new to this repo, use this order:

1. [Quickstart](quickstart.md)
2. [Worked Examples](examples/README.md)
3. [Contributor Workflow](../contribution/contributor-workflow.md)

If you need the full canonical rules later, use:

- [AI Working Contract](../../delivery/governance/ai-working-contract.md)
- [Spec-Driven Delivery](../../delivery/workflows/spec-driven-delivery.md)
- [Business To Spec Workflow](../../delivery/workflows/business-to-spec-workflow.md)
- [Traceability](../../delivery/governance/traceability.md)
- [Definition Of Done](../../delivery/governance/definition-of-done.md)

## The Minimum You Need To Remember

- Work from a governing feature package under `specs/features/FEAT-<AREA>-<ID>-<short-name>/`
- For normal feature-like work, the AI tool should start by creating or updating:
  - `business-request.md`
  - `spec-refinement.md`
  - `feature-spec.md`
- You review those artifacts before asking the AI tool to continue into implementation
- `validation-report.md` should be added once implementation or validation begins
- `api-spec.md`, `test-plan.md`, `task-breakdown.md`, `adr.md`, or `business-approval-summary.md` should only be added when the change really needs them
- If a shipped feature is still evolving, the AI tool should update the existing `FEAT-...` package instead of creating a new disconnected one
- If the change is just a typo or another low-risk fix, the AI tool may use the lighter path, and you should confirm that this makes sense

## Active Feature Packages In This Repo

These are the current governing packages you will usually work with:

- [FEAT-ENVIRONMENTS-001-management](../../specs/features/FEAT-ENVIRONMENTS-001-management/README.md)
- [FEAT-ENVIRONMENTS-002-dashboard](../../specs/features/FEAT-ENVIRONMENTS-002-dashboard/feature-spec.md)
- [FEAT-CLIENTS-001-management](../../specs/features/FEAT-CLIENTS-001-management/feature-spec.md)
- [FEAT-EXECUTION-001-start-stop-services](../../specs/features/FEAT-EXECUTION-001-start-stop-services/feature-spec.md)
- [FEAT-ASSISTANT-001-panel](../../specs/features/FEAT-ASSISTANT-001-panel/feature-spec.md)
- [FEAT-ASSISTANT-002-ai-chat-schedules](../../specs/features/FEAT-ASSISTANT-002-ai-chat-schedules/feature-spec.md)

If you are not sure whether a request belongs to one of these, use the [Worked Examples](examples/README.md) page first, then ask the AI tool to use the closest matching package.

## If You Are Using AI Tools

You can use Copilot, Codex, or Claude with this repo, but keep the same habits:

- point the tool to the right existing `FEAT-...` package when you know it
- ask it to create or update the spec first for feature-like work
- review the generated artifacts before implementation
- only ask for implementation when you actually want code changes

Tool-specific entrypoints live in:

- [GitHub Copilot Guidance](../../.github/copilot-instructions.md)
- [Codex Workspace Guidance](../../.codex/README.md)
- [Claude Workspace Guidance](../../.claude/README.md)
