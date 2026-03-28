# Frontend

This frontend is a React + TypeScript application built with Vite. It is organized around feature slices, with a thin app shell and shared modules for reusable UI, API, and widget infrastructure.

## Structure

```text
src/
  app/         # app shell, providers, routes, navigation
  auth/        # authz helpers and JWT utilities
  config/      # environment and runtime config
  contexts/    # cross-app React contexts
  features/    # feature-owned pages, components, api, tests
  hooks/       # shared hooks
  shared/      # reusable api, ui, widgets, and test-safe shared code
  styles/      # global and component-level styles
  test/        # test setup and test-only mocks
```

### App layer

- `src/main.tsx` bootstraps React, MSAL, i18n, and shared providers.
- `src/app/providers.tsx` contains app-wide providers.
- `src/app/routes.tsx` defines route configuration.
- `src/app/AppShell.tsx` renders the authenticated shell.

### Feature layer

Each feature owns its own pages and behavior. Current feature slices include:

- `dashboard`
- `chat`
- `health`
- `costs`
- `examples`
- `settings`
- `user`
- `environment`
- `logs`

### Shared layer

Shared code should be reusable across multiple features:

- `src/shared/api` for common API infrastructure
- `src/shared/ui` for reusable UI primitives
- `src/shared/widgets` for the dashboard widget system

Rule of thumb:
- if code is owned by one feature, keep it in that feature
- if code is reused broadly, move it to `shared`

## Environment

The frontend reads Vite env vars from `.env.local`, `.env`, or similar Vite env files.

Use this starter file:

```env
VITE_API_BASE_URL=http://localhost:7071
VITE_TENANT_ID=00000000-0000-0000-0000-000000000000
VITE_REDIRECT_URI=http://localhost:5174/
VITE_CLIENT_ID=00000000-0000-0000-0000-000000000000
VITE_API_CLIENT_ID=00000000-0000-0000-0000-000000000000
```

Recommended local setup:

1. copy `frontend/.env.example` to `frontend/.env.local`
2. replace the placeholder Entra ID values with real local/dev values
3. start the frontend with `npm run dev`

Notes:

- in development, missing env vars fall back to local defaults and log a warning
- in production, required env vars are strict and missing values will fail startup

## Scripts

Run these from `frontend/`:

```bash
npm run dev
npm run lint
npm run test
npm run test:watch
npm run typecheck
npm run build
npm run preview
```

## Authentication

The app uses MSAL React with a single `PublicClientApplication` created in `src/main.tsx`.

- `src/authConfig.tsx` defines MSAL config and scopes
- `src/contexts/AuthContext.tsx` exposes app-level auth state
- `src/auth/useAuthZ.tsx` handles authorization checks such as admin-only routes

`/settings` is currently the admin-protected route.

## Testing

The frontend uses Vitest.

Current test coverage includes:

- route and auth branching
- admin authorization behavior
- shared API helpers
- chat query mapping and submit flow
- dashboard widget registry and palette interaction
- health config API flow and help modal interaction

Testing setup lives in:

- `src/test/setup.ts`
- `src/test/mocks/`

## Current conventions

- keep feature-specific API code inside `features/<feature>/api`
- keep reusable HTTP helpers inside `shared/api`
- keep reusable UI primitives inside `shared/ui`
- keep dashboard widget infrastructure inside `shared/widgets`
- prefer lowercase route paths like `/user`
- use lazy loading for heavy routes and widget/editor code where possible

## Known follow-ups

The frontend is in a good structural state, but a few follow-ups remain:

- Monaco and Mermaid bundles are still heavy
- more interaction tests can still be added for deeper feature coverage
- a few stale header comments in files still reference old locations
