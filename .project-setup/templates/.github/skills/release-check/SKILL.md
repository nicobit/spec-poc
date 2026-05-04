---
name: release-check
description: Use this skill when the user wants a final implementation-readiness or release-readiness pass over a change, feature, or branch.
---

# Release Check

Use this skill when the user asks things like:

- "Check if this is ready"
- "Do a release-readiness pass"
- "What is left before we merge or ship?"
- "Run the final engineering checklist"

## Checklist

1. Confirm the intended behavior and scope.
2. Verify relevant build, lint, type-check, and test commands for the touched area.
3. Check for docs updates if workflow or user-visible behavior changed.
4. Check for compatibility or migration notes if contracts or schema changed.
5. Check for missing configuration or environment assumptions.
6. Check for observability, error handling, and rollback concerns where applicable.
7. Summarize:
   - ready
   - ready with caveats
   - not ready

## Guardrails

- Do not claim validation ran if it did not.
- Separate confirmed results from recommended next checks.
- Keep the final summary actionable and concise.
