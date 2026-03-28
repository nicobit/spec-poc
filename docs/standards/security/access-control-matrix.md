# Access Control Matrix

This document is the canonical repository-wide reference for application roles and their intended permissions.

Use it together with [module-authorization.md](module-authorization.md):

- `access-control-matrix.md`: defines roles and default permission intent
- `module-authorization.md`: maps those roles to concrete modules, pages, and APIs

## Update Rule

Update this file whenever:

- a new application role is introduced
- an existing role changes meaning
- role inheritance or authorization rules change
- group-to-role mapping assumptions change

If implementation changes auth behavior without updating this document, the change is incomplete.

## Role Catalog

| Role | Purpose | Typical Capabilities | Notes |
| --- | --- | --- | --- |
| `AuthenticatedUser` | Baseline signed-in user access | Can access authenticated routes and user-scoped features | Use when a feature requires sign-in but no elevated role |
| `Admin` | Full administrative access | Can administer protected modules, settings, and operational features | Must match the configured application role in identity provider and backend checks |
| `EnvironmentManager` | Environment lifecycle operator | Can view and manage environment schedules and lifecycle actions | Use only if the repo enables environment-specific delegated management |

## Role Semantics

### `AuthenticatedUser`

- Requires a valid signed-in identity
- Does not imply elevated administrative permissions
- Should be the default for non-public internal application features

### `Admin`

- Intended for platform, operational, or tenant-level administration
- Should be required for sensitive configuration, cache reset, destructive admin actions, and privileged views
- Frontend and backend naming must stay aligned

### `EnvironmentManager`

- Intended for environment-lifecycle and scheduling operations
- Should not automatically imply full admin rights unless explicitly decided
- If not used in implementation, leave documented as reserved or future-facing rather than silently deleting it

## Authorization Decision Rules

When documenting or implementing access decisions:

1. Decide whether the behavior is:
   - public
   - authenticated
   - role-restricted
2. Record the rule in [module-authorization.md](module-authorization.md).
3. Reflect the same rule in:
   - feature spec
   - API spec when relevant
   - test plan
4. Update code and tests to match.

## Source Of Truth References

- Frontend auth helper: [useAuthZ.tsx](../../frontend/src/auth/useAuthZ.tsx)
- Backend role checks: [roles.py](../../backend/app/auth/roles.py)
- Backend claim normalization: [authz.py](../../backend/shared/authz.py)

## Review Checklist

- Are role names consistent across frontend, backend, specs, and identity configuration?
- Is every elevated action mapped to a documented role?
- Is every public exception explicitly documented?
- Do tests verify both allowed and denied paths?
