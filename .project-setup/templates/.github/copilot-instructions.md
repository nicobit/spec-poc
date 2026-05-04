# Repository Instructions

Replace placeholders with project-specific details and remove any lines that do not apply.

- Understand the existing architecture before making changes.
- Prefer minimal, localized edits over broad refactors unless the task explicitly calls for restructuring.
- Preserve existing public contracts unless the change explicitly includes a migration or compatibility plan.
- Do not invent APIs, config keys, environment variables, database fields, feature flags, or scripts.
- If required information is missing, state assumptions clearly and choose the safest backward-compatible path.
- Match existing conventions for naming, file placement, error handling, and testing unless there is a clear reason to improve them.

## Build And Validate

- Use the repository's actual commands for build, test, lint, and type-checking.
- Before considering work complete, run the smallest relevant validation steps first, then broader checks if needed.
- If behavior changes, update or add tests.
- If developer workflow or user-visible behavior changes, update docs.

## Change Safety

- Keep changes easy to review.
- Do not mix unrelated cleanup into feature or bug-fix work.
- Highlight risky areas before modifying them: authentication, authorization, persistence, billing, security, deployment, or shared public interfaces.
- For data shape or API contract changes, document compatibility impact.

## Working Style

- For small, low-risk tasks, implement directly.
- For larger or cross-cutting tasks, first outline scope, constraints, and acceptance criteria.
- Call out tradeoffs when there are multiple reasonable approaches.
- Prefer deterministic behavior over hidden automation or implicit side effects.

## Preparing For Later Spec-Driven Development

- Make assumptions explicit.
- Capture important constraints close to the code or in docs.
- Separate goals, constraints, and acceptance criteria whenever the task is non-trivial.
- Avoid burying business rules in UI-only or test-only implementations.
