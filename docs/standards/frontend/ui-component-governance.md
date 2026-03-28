# UI Component Governance

This document defines how to decide where UI code belongs and how to keep component design consistent.

## Decision Rule

Place UI code in the narrowest correct home:

- feature-specific UI stays inside `frontend/src/features/...`
- reusable UI primitives go in `frontend/src/shared/ui`
- reusable dashboard/widget infrastructure goes in `frontend/src/shared/widgets`
- app shell navigation and layout pieces stay in `frontend/src/app`

Use the costs page structure as the preferred direction for rich operational pages:

- thin route page
- feature-owned dashboard/view component
- clear top summary and controls
- primary content in dedicated sections

Do not use the environments page as the default structural model in its current form.

## Before Creating A New Component

Check whether one of these already covers the need:

- existing feature-local component
- shared UI primitive
- shared widget
- app shell component

Do not create a new component if the change is only a small variation of an existing one.

Before creating a new page, check whether the feature can follow the default dashboard/page structure from `docs/standards/frontend/ui-standards.md`.

## Shared Component Expectations

Shared UI components should:

- have clear and stable props
- avoid embedding feature-specific business logic
- be named by purpose, not by page
- support accessible usage by default
- consume semantic theme tokens or shared theme classes for visual styling
- avoid hardcoding brand-specific colors unless they are intentionally tokenized

## Feature Component Expectations

Feature components may:

- use feature-specific types and behavior
- encode domain-specific workflows
- compose shared primitives

Feature components should not become hidden shared dependencies across unrelated features.

## Review Checklist

When changing UI, verify:

- the page follows the default structure unless the spec says otherwise
- shared components are reused where appropriate
- states are explicit
- accessibility is preserved
- tests cover meaningful user-visible behavior
- docs are updated if a new reusable pattern was introduced

Additional hard checks for new pages:

- the route page is thin and delegates to a feature-owned view when appropriate
- the page does not rely on console-only error handling
- primary actions are real, not placeholders
- expensive reloads are explicit and scoped
- modals and overlays are rendered once at the appropriate level, not inside mapped rows or cards
- page styling does not hardcode a single visual theme family when the same result can be expressed through shared theme tokens or shared primitives
