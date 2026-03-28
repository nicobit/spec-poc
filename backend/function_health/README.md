# Backend Health Function

This area contains the health-check API that is exposed through Azure Functions and also loaded into the shared ASGI runtime.

Current Azure Functions entrypoint:

- `backend/function_health/__init__.py`

Current FastAPI app:

- `backend/function_health/app/app.py`

## What It Does

The health service provides:

- a public liveness endpoint
- authenticated dependency checks
- authenticated access to the current health configuration
- admin-only configuration mutation endpoints
- schema and validation helpers for the health configuration payload

## Current Endpoints

Public:

- `GET /health/healthz`

Authenticated:

- `GET /health/readyz`
- `GET /health/deps`
- `GET /health/config`
- `GET /health/config/services`
- `GET /health/config/services/{name}`
- `GET /health/config/schema`
- `POST /health/config/validate`

Admin-only:

- `PUT /health/config`
- `POST /health/config/services`
- `PUT /health/config/services/{name}`
- `DELETE /health/config/services/{name}`

## Configuration Repository

The service reads its dependency-check configuration through the repository layer under:

- `backend/function_health/app/repositories`

Supported repository modes are still controlled by environment settings such as:

- `CONFIG_REPOSITORY_KIND`
- `CONFIG_BLOB_ACCOUNT_URL`
- `CONFIG_BLOB_CONTAINER`
- `CONFIG_BLOB_NAME`
- `CONFIG_BLOB_CONNECTION_STRING`
- `CONFIG_FILE_PATH`

If blob-backed configuration is used, the runtime identity needs write access to the target blob container.

## Authentication Model

- Azure Functions `authLevel` remains `anonymous` at the platform layer by repository policy.
- Application-level authentication protects every route except `GET /health/healthz`.
- Admin-only behavior is enforced in the FastAPI layer, not in the Azure Functions binding.

## Runtime Notes

This function still runs through Azure Functions today, but it is also loaded by the ASGI runtime at:

- `backend/runtimes/asgi/app.py`

That makes it part of the container/App Service/AKS path as well.

## Files Worth Starting With

- `backend/function_health/app/health_router.py`
- `backend/function_health/app/config_router.py`
- `backend/function_health/app/config_loader.py`
- `backend/function_health/app/repositories/factory.py`

## Notes

- The old repository-imported documentation for this folder was no longer accurate and has been replaced with the current route and auth model.
- For environment-wide setup, prefer the docs in `docs/standards/` and `backend/deployment/`.
