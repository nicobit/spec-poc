---
name: backend-auth-hardening
description: Apply backend route authentication and role-hardening rules, preserve the repository auth policy, and update tests and docs when backend access behavior changes.
---

# Backend Auth Hardening

Use this skill when changing backend routes, auth dependencies, or security-sensitive API behavior.

## Policy

- Azure Functions `authLevel` remains `anonymous`
- application-level authentication protects all backend routes except `GET /health/healthz`

## Checklist

1. Identify every affected backend route.
2. Verify whether the route should be public, authenticated, or admin-only.
3. Preserve bearer-token validation and role-based checks where needed.
4. Update backend HTTP/API tests when auth behavior changes.
5. Update documentation if the effective route policy changes.

## Read First

- `backend/README.md`
- `tests/backend/test_http_routes.py`
- `backend/function_health/README.md`
