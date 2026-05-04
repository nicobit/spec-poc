---
applyTo: "**/__tests__/**,tests/**,**/*.test.*,**/*.spec.*"
---

# Testing Instructions

- Prefer deterministic tests that do not depend on timing, execution order, network access, or shared mutable state.
- Test observable behavior and invariants, not implementation trivia.
- Use the smallest test layer that meaningfully covers the change.
- Add regression coverage for bug fixes.
- Avoid snapshot sprawl when assertions on targeted behavior are clearer.
- Keep fixtures realistic but minimal.
- If a scenario is hard to test, explain the gap explicitly rather than hiding it.
