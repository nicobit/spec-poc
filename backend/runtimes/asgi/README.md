# ASGI Runtime

This runtime is the first step toward running the backend outside Azure Functions.

It aggregates the existing FastAPI surfaces from the current backend into one ASGI app so the backend can be hosted on:

- Azure App Service
- Azure Container Apps
- AKS
- any other ASGI-compatible environment

Current entrypoint:

- `backend/runtimes/asgi/app.py`

Example startup command:

```bash
uvicorn runtimes.asgi.app:app --host 0.0.0.0 --port 8000
```

Example Docker build from the repository root:

```bash
docker build -f backend/Dockerfile -t admin-portal-backend .
```

The ASGI runtime loads the current feature apps incrementally. If one subapp fails to load because of missing configuration, the runtime still starts and exposes the failure in:

- `GET /runtime/healthz`

This is intentionally transitional while the backend continues moving from legacy `function_*` folders toward thin runtime adapters plus `backend/shared/`.
