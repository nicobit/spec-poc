---
name: authorization-doc-review
description: Review and update authorization documentation when roles, route protection, permissions, or module access behavior change across frontend, backend, and specs.
---

# Authorization Documentation Review

Use this skill when a change touches roles, route protection, permissions, or module access behavior.

## Goal

Keep authorization documentation aligned with implementation across:

- frontend route guards
- backend auth dependencies and role checks
- feature specs
- API specs
- test plans
- central authorization docs

## Read First

- `docs/standards/security/access-control-matrix.md`
- `docs/standards/security/module-authorization.md`
- `frontend/src/auth/useAuthZ.tsx`
- `backend/app/auth/roles.py`
- `backend/shared/authz.py`

## Checklist

1. Identify every changed module, route, page, or endpoint.
2. Classify each affected surface as:
   - public
   - authenticated
   - role-restricted
3. Verify frontend and backend enforcement stay aligned.
4. Update:
   - `docs/standards/security/access-control-matrix.md` if role meaning changed
   - `docs/standards/security/module-authorization.md` for affected modules
   - feature spec / API spec / test plan if the change is feature-scoped
5. Ensure tests cover both allowed and denied paths where relevant.

## Output

When using this skill, provide:

- affected modules and routes
- required documentation updates
- any mismatches between code and docs
- any missing auth tests

