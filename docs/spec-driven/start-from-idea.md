# Start From Idea

Use this page when you have a new idea, enhancement, or bug fix and want the fastest safe path.

## The Default Flow

1. Give the AI tool the idea or request.
2. Ask it to use `Feature Orchestrator`.
3. Let it draft the minimum governing feature package.
4. Review the draft.
5. Ask for implementation only after the draft looks right.

## What To Say

Use this:

- `Use the Feature Orchestrator. Draft the minimum governing feature package for this request. Do not implement yet.`

If you already know the feature package:

- `Use FEAT-... for this request. Update the spec first. Do not implement yet.`

If you are ready for implementation:

- `The spec is reviewed. Proceed with implementation.`

## What The AI Tool Should Draft

For normal feature-like work, it should usually create or update:

- `business-request.md`
- `spec-refinement.md`
- `feature-spec.md`

It may also add more artifacts when needed, such as `api-spec.md` or `test-plan.md`.

## What You Should Review

Before asking for implementation, check:

- Is this the right existing `FEAT-...` package, or does a new one really need to be created?
- Does the draft clearly say what is in scope?
- Does it clearly say what is out of scope?
- Are the assumptions acceptable?
- Are the acceptance criteria clear enough to build and test?
- Does it need `api-spec.md` or `test-plan.md`?

If yes, ask the AI tool to continue.

## For Bug Fixes

Use this simple split:

- Trivial bug fix:
  - typo
  - copy-only issue
  - low-risk mechanical fix
  - ask the AI tool whether the lighter path is appropriate

- Important bug fix:
  - user-visible behavior changed
  - contract, auth, or validation behavior changed
  - bug touches a real shipped capability
  - use the existing governing `FEAT-...` package and update the spec first

## If You Are Unsure

Use:

- [Quickstart](quickstart.md)
- [Worked Examples](examples/README.md)
