# Health Function Agent Notes

This folder owns the backend health-check feature area.

Use this file when working specifically on `backend/function_health`.

## Current Shape

- Azure Functions wrapper: `backend/function_health/__init__.py`
- FastAPI app: `backend/function_health/app/app.py`
- Health endpoints: `backend/function_health/app/health_router.py`
- Config endpoints: `backend/function_health/app/config_router.py`
- Config repository layer: `backend/function_health/app/repositories`

## Auth Rules

Treat these rules as the source of truth when editing this feature:

- `GET /health/healthz` is intentionally public
- all other health routes require authentication
- config write operations require admin access

Do not weaken those rules unless the repository-level standards are updated deliberately.

## Coding Guidance

- Keep checks read-only and fast
- Prefer explicit timeouts and error shaping over silent failures
- Do not log secrets, tokens, or connection strings
- Keep repository-backed config changes ETag-safe
- Prefer shared imports from `shared/...` when a common backend helper is needed

## Local Reasoning Checklist

When changing this area, check:

1. Does the route auth still match the intended policy?
2. Does the config repository behavior still work for both blob and file modes?
3. Does the ASGI runtime still load this subapp cleanly?
4. Do backend tests still cover the changed behavior?

## Related Tests

- `tests/backend/test_dashboard_and_health.py`
- `tests/backend/test_http_routes.py`

## Avoid

- Reintroducing anonymous config-management routes
- Reintroducing stale route names like `/config/*` without the `/health` prefix
- Documenting Azure Functions platform auth as the primary protection layer
