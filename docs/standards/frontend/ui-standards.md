# UI Standards

These standards define the default UI expectations for pages and components in the frontend.

## Core Rule

Prefer consistency and reuse over one-off page structure. New UI should look like it belongs to the same product unless the feature spec explicitly calls for a different visual treatment.

These rules are mandatory defaults for new pages unless the feature spec explicitly documents a justified exception.

## Theme Rule

Theme support is a hard platform concern, not a page concern.

All new UI must be compatible with:

- more than one visual theme family
- both light and dark mode inside a theme family

Hard rules:

- pages and feature components must not define product identity through raw one-off color combinations
- app shell and shared UI primitives must consume semantic theme tokens
- visual theme switching must happen through provider state and configuration, not page-specific conditionals
- adding a new theme must not require editing every page

Prefer semantic roles such as:

- page background
- panel background
- elevated surface
- border subtle
- text primary
- text muted
- accent primary
- sidebar background
- topbar background
- table header background

Do not make page layouts depend on a single theme family.

## Page Structure

Use this default page shape when the feature does not require something special:

1. page header
2. short purpose or status text when needed
3. primary actions
4. filters or controls
5. main content area
6. explicit loading, empty, and error states

Do not skip the page header and do not scatter page-level actions across unrelated sections.

For data-heavy pages, use this standard composition:

1. title and short context
2. top-level actions such as refresh
3. filters or query controls
4. summary or KPI cards when the page benefits from a quick overview
5. primary visualization or table area
6. explicit loading, empty, error, and unauthorized states

This is the default pattern to follow for operational dashboards, admin pages, and reporting screens.

Page headers should:

- use a clear page title
- keep primary actions near the title area
- avoid repeating the same title inside nested panels

## Layout and Spacing

- keep spacing consistent across pages
- prefer existing layout patterns already used in the application shell
- group related controls together
- avoid dense screens with no visual separation between sections
- preserve responsive behavior for desktop and smaller laptop widths as a minimum
- avoid placeholder grid wrappers that do not add meaningful layout structure

## Shared UI First

Before creating a new UI primitive, check:

- `frontend/src/shared/ui`
- `frontend/src/shared/widgets`

Prefer extending an existing shared component over creating a near-duplicate.

When a component is intended to be shared, it must expose theme-safe styling hooks or consume shared semantic classes instead of hardcoding a one-off visual identity.

Page components should usually stay thin:

- page route component owns routing-level concerns
- feature view component owns the actual screen content
- reusable primitives belong in shared UI areas

## States

Every user-facing page or major panel should make these states explicit when relevant:

- loading
- empty
- success or completed
- error
- unauthorized or forbidden

Do not leave users with blank areas when data is missing, loading, or denied.

Hard rules:

- every new page must define how loading, empty, error, and unauthorized states appear
- failures must be visible to the user, not only logged to the console
- destructive or unavailable actions must not appear active without a working handler

## Forms

- keep labels visible and clear
- show validation near the relevant field
- distinguish destructive actions from safe actions
- disable or guard actions while submission is in progress
- keep submit and cancel behavior predictable
- avoid firing expensive network requests on every keystroke unless the spec explicitly calls for live search

## Tables and Lists

- use stable column names
- align actions consistently
- keep filter and sort behavior understandable
- provide an empty state instead of an empty grid
- avoid putting critical actions behind unclear icon-only affordances
- pagination controls must be driven by total result metadata, not by current page length alone

## Navigation and Actions

- use route names and page titles consistently
- keep primary actions visually distinct from secondary actions
- avoid introducing one-off navigation patterns when the shell already provides one
- primary buttons must either work, be intentionally disabled with explanation, or be omitted until ready
- avoid page refresh via `window.location.reload()` when a scoped data reload can be used instead

## Accessibility

- use semantic elements where possible
- preserve keyboard accessibility
- keep focus behavior predictable for dialogs, drawers, and forms
- provide accessible names for buttons and inputs
- do not rely on color alone to communicate state
- avoid rendering duplicate dialogs or overlays from inside mapped collections

## Responsive Behavior

- support the application on common laptop and desktop widths
- ensure layouts degrade cleanly on smaller screens
- avoid hard-coded widths that break forms, tables, or dialogs

## Text And Encoding

- UI copy must render cleanly in UTF-8
- do not leave mojibake or broken glyphs such as `â€¢`, `â€”`, or corrupted icons in visible text
- prefer plain ASCII fallbacks over broken encoded characters when in doubt

## When To Create A New Shared Component

Create or promote a component into `shared/ui` when:

- it is used by more than one feature, or
- it expresses a product-wide pattern that should stay consistent

Keep feature-specific components inside the feature when the behavior or layout is domain-specific.
