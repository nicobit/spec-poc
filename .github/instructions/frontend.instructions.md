---
applyTo: "frontend/**/*.{ts,tsx,js,jsx,css}"
---

When editing frontend code:

- align behavior with the approved feature spec and UX expectations
- read `docs/standards/frontend/ui-standards.md` and `docs/standards/frontend/ui-component-governance.md` before changing pages or reusable UI
- prefer existing `frontend/src/shared/ui`, `frontend/src/shared/widgets`, and `frontend/src/app` building blocks before creating new ones
- keep page structure, actions, filters, and state handling consistent with the repository UI standards
- treat the UI standards as hard defaults for new pages unless the feature spec explicitly documents an exception
- keep theme switching compatible with theme families plus light/dark mode; prefer semantic theme tokens and shared primitives over page-level color choices
- make loading, empty, success, and error states explicit
- preserve accessibility expectations
- preserve responsive behavior for common desktop and laptop widths at minimum
- keep changes scoped and reviewable
- add or update tests for important user-visible behavior changes
- avoid embedding backend or deployment assumptions into the UI where possible

