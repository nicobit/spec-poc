# Feature Spec — Environment Status Widget (FEAT-ENV-WIDGET-001)

## Feature summary

Provide a dashboard widget that shows the current status of multiple user-selected environments. The widget is compact, interactive, and intended for quick glance monitoring.

## Acceptance criteria

1. The widget allows the user to add one or more environments by environment id or via a search/autocomplete.
2. The widget displays a list of added environments with: name, `status` (Up/Down/Degraded), `lastChecked` (relative time), owner/team, and an optional small metric (e.g. `errorRate`).
3. The widget supports removing environments and reordering the list (drag/drop or move controls).
4. Favorite list persists across page reloads via `localStorage` for MVP.
5. The widget shows loading state for first fetch and individual error state if a fetch for an environment fails.
6. Data refreshes on a 30s polling interval by default; manual refresh control is present.
7. Clicking an environment navigates to its environment detail page.

## API contract (MVP)

- GET `/api/environments/{id}` — existing endpoint used for fetching environment detail.

Sample response (partial):

{
  "id": "env-5ce915aa",
  "name": "staging-1",
  "status": "Up",
  "lastChecked": "2026-04-06T12:34:56Z",
  "owner": "team-infra",
  "metrics": { "errorRate": 0.01 }
}

Notes: widget should tolerate missing `metrics` fields.

## UI contract

- Widget card with header `Environment status` and an `Add` control.
- Rows: left status dot (green/amber/red), env name (link), small metadata line with `owner • lastChecked • metric`.

## Data storage

- Server-side (preferred): favorites persisted per user in the backend database and exposed via user-scoped API endpoints. The frontend should read/write favorites through the API and fall back to `localStorage` only for anonymous/dev flows.

Storage notes:

- Persist an ordered array of environment ids keyed by the authenticated user's id.
- Backend storage may use the existing user-profile table or a small `user_preferences` table/collection. Keep schema minimal: `user_id`, `key` (e.g., `env_widget.favorites`), `value` (json array), `updated_at`.


## API contract (server-side favorites)

- GET `/api/users/me/env-favorites` — returns ordered favorites for the current authenticated user.

Response 200:

{
  "favorites": ["env-5ce915aa", "env-abc123"]
}

- PUT `/api/users/me/env-favorites` — replace the entire ordered favorites list.

Request body:

{
  "favorites": ["env-5ce915aa", "env-abc123"]
}

Response 200: same as GET

- POST `/api/users/me/env-favorites` — add a single environment id to the end of the favorites list.

Request body:

{
  "id": "env-xyz789"
}

Response 201: same as GET

- DELETE `/api/users/me/env-favorites/{id}` — remove the environment id from the user's favorites.

Response 204: no content

Notes:

- All endpoints require authentication and return `403` if the caller is not authorized for the user. For convenience, the `me` path should resolve to the authenticated principal.
- The frontend should optimistically update the UI and reconcile with server responses.

## Security & Auth

- The widget uses existing authenticated APIs. In local dev, `DEV_AUTH_ANONYMOUS` may be used. Ensure backend authorization is enforced for user-scoped favorites in deployed environments. Validate the authenticated principal and only allow access to the caller's own favorites.

## Tests

- Unit tests for the React component: add/remove, persistence, loading state, error state, polling behavior (mock timers).
- Simple visual/interaction test to ensure the add/search flow and navigation link work.

## Rollout notes

- Feature toggled behind a frontend feature flag for initial rollout.

## Next steps

1. Review and approve spec.
2. Implement frontend widget in `frontend/src/components` and wire to dashboard container.
3. Add tests and documentation.
