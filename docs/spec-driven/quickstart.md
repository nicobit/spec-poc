# Quickstart

Use this page when you want the fastest correct path.

## What To Do

1. Start with the request.
2. Ask the AI tool to use `Feature Orchestrator`.
3. Ask it to find or create the right `FEAT-...` package.
4. Review the draft.
5. Ask it to implement only after you approve the spec.

## What To Ask

For most feature-like work, start with:

- `Use the Feature Orchestrator. Find or create the governing FEAT package and draft the spec. Do not implement yet.`

If you already know the package:

- `Use FEAT-... for this request. Update the spec first. Do not implement yet.`

If you are ready for code:

- `The spec is reviewed. Proceed with implementation.`

## What The AI Tool Should Do

For a normal feature or enhancement, it should first create or update:

- `business-request.md`
- `spec-refinement.md`
- `feature-spec.md`

It should not jump straight to implementation unless you ask it to.

## What You Should Review

Before implementation, check that the draft clearly explains:

- what is being changed
- what is not being changed
- the assumptions
- the acceptance criteria
- whether the right `FEAT-...` package was selected
- whether `api-spec.md` or `test-plan.md` is needed

If that looks right, ask the AI tool to continue.

## When More Files Are Needed

The AI tool may also add:

- `api-spec.md`
- `test-plan.md`
- `task-breakdown.md`
- `adr.md`
- `validation-report.md`

These are not required every time. They should only appear when the change needs them.

## For Bug Fixes

If the change is just a typo or another clearly low-risk fix, ask:

- `This looks like a trivial change. Confirm whether the lighter path is appropriate.`

If the fix changes real user-visible behavior or touches contracts, auth, or validation, ask the AI tool to use the existing governing `FEAT-...` package and update the spec first.

## If You Are Unsure

Use [Worked Examples](examples/README.md) and pick the one closest to your request.
