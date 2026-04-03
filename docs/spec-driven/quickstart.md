# Quickstart

Use this page when you want to start a change quickly with AI assistance.

## Step 1: Start from the request

Begin with the request and decide which of these it is:

- new feature
- enhancement to an existing feature
- serious bug fix
- trivial bug fix
- docs-only change

If you are unsure, check the [Worked Examples](examples/README.md) before asking the AI tool to proceed.

## Step 2: Ask the AI tool to find the right feature package

Ask the AI tool to look under `specs/features/`.

What you should expect:

- if the request extends something that already exists, it should update that existing `FEAT-...` package
- if the request is genuinely new, it should create a new `FEAT-...` package
- if the request is trivial, it should avoid creating a feature package unless there is a good reason

Good default:

- prefer updating an existing governing package over creating a narrow enhancement-only package

## Step 3: Let the AI tool create the minimum spec

For normal feature-like work, the AI tool should start with:

- `business-request.md`
- `spec-refinement.md`
- `feature-spec.md`

You can ask it to use the templates in [templates](../../templates/README.md).

Your job at this point is to review what was created and correct it if needed.

## Step 4: Check whether extra artifacts are needed

You should expect the AI tool to add:

- `api-spec.md` if request/response shapes, validation, compatibility, or authorization behavior change materially
- `test-plan.md` if the behavior is non-trivial, integration-heavy, role-sensitive, or edge-case-heavy
- `task-breakdown.md` if the work needs explicit sequencing or coordination
- `adr.md` if you are making a meaningful cross-cutting design decision

## Step 5: Ask for implementation only when the spec is clear enough

You are ready to ask the AI tool to implement when the spec is clear enough to describe:

- scope
- assumptions
- constraints
- affected surfaces
- acceptance criteria or equivalent success conditions

If the request only says "create a feature" or "add a feature", that should not be treated as permission to skip the spec step.

## Step 6: Review the delivery output

Once implementation or validation begins, the AI tool should:

- add or update `validation-report.md`
- update tests
- update documentation when delivered behavior changes

Before closing, you should check:

- [Definition Of Done](../../delivery/governance/definition-of-done.md)
- [Traceability](../../delivery/governance/traceability.md)

## Good Prompts To Use

Examples:

- "Create or update the governing feature package for this request, but do not implement yet."
- "Use the existing `FEAT-ENVIRONMENTS-001-management` package for this change and update the spec first."
- "This is a trivial bug fix. Confirm whether the lighter path is appropriate."
- "Proceed with implementation now that the spec is reviewed."
