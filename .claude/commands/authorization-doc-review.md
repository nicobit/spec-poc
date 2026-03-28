# Claude Command: Authorization Documentation Review

Use this command when the request touches roles, permissions, route protection, or access policy.

Read:

- `docs/standards/security/access-control-matrix.md`
- `docs/standards/security/module-authorization.md`
- `frontend/src/auth/useAuthZ.tsx`
- `backend/app/auth/roles.py`
- `backend/shared/authz.py`

Then:

1. identify affected modules, routes, and role checks
2. classify each surface as public, authenticated, or role-restricted
3. check frontend and backend enforcement stay aligned
4. update the central authorization docs when behavior changed
5. call out any missing auth tests or undocumented access rules

