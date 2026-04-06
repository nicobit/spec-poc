# Spec Refinement — Environment Status Widget

## Assumptions

- The backend exposes a per-environment GET endpoint at `/api/environments/{id}` that returns the status and metadata (confirmed by local dev server usage).
- The widget will persist user favorites server-side via new user-scoped endpoints (see `feature-spec.md`). The frontend will read/write favorites through the API for authenticated users and fall back to `localStorage` for anonymous/dev flows.

## Implementation notes

- Backend must provide simple CRUD endpoints for the authenticated user's favorites (GET, PUT, POST, DELETE) and persist an ordered array of environment ids.
- Frontend will call the user's favorites endpoint on load, render the list, and request environment details for each id. Local caching and debounce/polling strategies will reduce load on the environment endpoints.

## Open questions

- Persist favorites server-side per user? (requires auth + backend storage). Default: `localStorage` for MVP.
- Polling interval: default 30s, configurable in future.
- Which exact health metrics to show by default? Suggest: `status`, `lastChecked`, `owner`, `errorRate` (if available).

## UX notes

- Compact list card, each row shows environment name, colored status dot, last-checked relative time, and an overflow menu for details/remove.
- Clicking a row opens the environment page.

## Acceptance test pointers

- Add environment → appears in list and is persisted across reloads (localStorage).
- Remove environment → removed from list and persisted.
- Loading and individual-item error states displayed correctly.
