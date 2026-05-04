---
applyTo: "frontend/**,src/components/**,src/ui/**"
---

# Frontend Instructions

- Preserve the existing component and state-management patterns unless the task explicitly calls for refactoring.
- Keep presentation concerns separate from data-fetching, domain rules, and persistence logic.
- Prefer accessible components and keyboard-safe interactions.
- Avoid introducing hidden global state when file-local or feature-local state is sufficient.
- Reuse existing design tokens, component primitives, and style conventions where present.
- Be careful with rendering performance in lists, trees, canvases, dashboards, or editors.
- Do not hardcode API response assumptions that are not defined by the current backend contract.
- If user-facing behavior changes, update the relevant tests and docs.
