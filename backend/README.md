# Backend

The backend currently supports two hosting models:

- Azure Functions: current production-oriented entrypoints in the legacy `function_*` folders
- ASGI runtime: unified app entrypoint for container, App Service, Azure Container Apps, or AKS hosting

The repository also includes CI examples for both:

- GitHub Actions
- GitLab CI

## Python Version

The backend is now aligned to Python 3.13 for CI and containerized runtime setup.

Recommended local version:

- Python 3.13

For Azure Functions local development, make sure your Functions Core Tools installation is using the same interpreter or virtual environment you install the backend dependencies into.

## Current Runtimes

- Azure Functions entrypoints:
  - `function_costs`
  - `function_dashboard`
  - `function_diagrams`
  - `function_environment`
  - `function_health`
  - `function_llm_proxy`
  - `function_queryexamples`
  - `function_scheduler_timer`
  - `function_scheduler_worker`
  - `function_texttosql`
- ASGI entrypoint:
  - `runtimes/asgi/app.py`

## Shared Code

Runtime-agnostic imports should prefer `shared/...`.

That shared surface currently wraps the legacy `app/...` modules while the backend continues moving toward a cleaner separation between:

- shared code
- runtime adapters
- deployment targets

## Recommended Local Development Workflow

The safest local setup is:

1. create a Python 3.13 virtual environment
2. install backend requirements into that virtual environment
3. run either the ASGI runtime or Azure Functions from the same activated environment

From `backend/` on Windows PowerShell:

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

If you already created `.venv` with an older Python version, delete it and recreate it before installing requirements again. Reusing a 3.11 virtual environment after switching the repo to 3.13 will cause confusing import and wheel issues.

After activation, verify the interpreter:

```powershell
python --version
```

It should report Python 3.13.x.

## Local Configuration

For local Azure Functions startup, use:

- `backend/local.settings.json`

This repository now includes a starter local settings file. The important minimum values for Functions startup are:

- `AzureWebJobsStorage`
- `FUNCTIONS_WORKER_RUNTIME`

Because this backend includes timer and queue triggers, `AzureWebJobsStorage` is required even if you only want to test HTTP-triggered functions.

If you keep:

- `AzureWebJobsStorage=UseDevelopmentStorage=true`

then you also need Azurite running locally.

Reference files:

- `local.settings.json`
- `local.settings.reference.json`

## Run As ASGI

From `backend/` with the virtual environment activated:

```powershell
uvicorn runtimes.asgi.app:app --host 0.0.0.0 --port 8000
```

Health endpoints:

- runtime shell: `GET /runtime/healthz`
- application liveness: `GET /health/healthz`

Use the ASGI path when you want to work on:

- container/App Service/AKS compatibility
- unified FastAPI behavior
- backend routes without Azure Functions trigger behavior

## Run As Azure Functions

From `backend/` with the virtual environment activated:

```powershell
func start
```

Recommended local prerequisites:

- Azure Functions Core Tools
- Azurite, if using `UseDevelopmentStorage=true`
- `backend/local.settings.json`

Use the Functions path when you want to validate:

- HTTP trigger hosting behavior
- timer/queue trigger behavior
- the current Azure Functions adapter layout

## Common Local Issues

### Missing `AzureWebJobsStorage`

This backend has timer and queue triggers, so Functions requires `AzureWebJobsStorage`.

Fix:

- ensure `backend/local.settings.json` exists
- ensure it contains `AzureWebJobsStorage`
- start Azurite if using `UseDevelopmentStorage=true`

### `ModuleNotFoundError` for backend packages

This usually means:

- dependencies are not installed into the interpreter used by `func start`
- or Functions is using a different Python than the one where you ran `pip install`

Fix:

1. activate the backend virtual environment
2. run `pip install -r requirements.txt`
3. start `func` from the same activated shell

### Missing optional service configuration

Some feature areas depend on optional environment values or external services. The backend is designed to lazy-load many of these dependencies, but feature-specific routes may still need:

- Entra ID settings
- Key Vault URI and secret names
- Azure OpenAI settings
- SQL connection settings
- Cosmos DB connection settings for schedule persistence

See:

- [Backend App Settings](../docs/standards/backend-app-settings.md)

## Docker

Build from the repository root:

```bash
docker build -f backend/Dockerfile -t admin-portal-backend .
```

Run locally:

```bash
docker run --rm -p 8000:8000 admin-portal-backend
```

The container starts the ASGI runtime with:

```bash
uvicorn runtimes.asgi.app:app --host 0.0.0.0 --port 8000
```

## Testing

From the repository root:

```powershell
python -m unittest discover -s tests/backend -p "test_*.py"
python -m compileall backend tests/backend
```

## CI/CD

The backend container build is defined in:

- [GitHub Actions CI](../.github/workflows/ci.yml)
- [GitLab CI](../.gitlab-ci.yml)

Both pipelines currently:

- run backend tests
- run backend compile checks
- build the ASGI container image
- publish the backend ASGI image on `main` / `master`

See [Container Delivery](../docs/standards/container-delivery.md) for the registry model on GitHub and GitLab.
See [Azure App Service Deployment](../docs/standards/appservice-deployment.md) for the first deployment target.
See [Azure App Service Infrastructure](../docs/standards/appservice-infrastructure.md) for the IaC template that provisions the target resources.
See [Azure App Service Bootstrap](../docs/standards/appservice-bootstrap.md) for the end-to-end Azure setup checklist.
See [Backend App Settings](../docs/standards/backend-app-settings.md) for the runtime configuration inventory.

## Notes

- Azure Functions `authLevel` is intentionally kept `anonymous` at the platform layer.
- Application-level authentication protects all backend routes except `GET /health/healthz`.
- The ASGI runtime is incremental; it loads feature apps and reports load issues through `/runtime/healthz`.
