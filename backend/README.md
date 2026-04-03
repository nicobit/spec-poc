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

Repository-local virtualenv (recommended)

For consistent local runs across developers and CI, create the virtual environment at `backend/.venv` and point the Functions worker to it. Example commands:

```powershell
cd backend
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

We set `languageWorkers:python:defaultExecutablePath` in `local.settings.json` to `.venv\Scripts\python.exe` so the Functions host uses the repo-local interpreter. This avoids machine-specific absolute paths and makes local development reproducible.

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

## Azure / OpenAI local setup

Purpose: explain how the backend fetches OpenAI credentials and how to run locally vs. production.

Key concepts:

- Secrets are stored in Azure Key Vault; the app reads secret *names* from environment variables and then fetches values at runtime.
- Local dev uses `DefaultAzureCredential` (VS Code / `az login` / service principal). Production uses `ManagedIdentityCredential` (assign an identity to the host and grant Key Vault `get` permission).

Important env vars (examples)

- `KEY_VAULT_CORE_URI` — Key Vault base URL (e.g. `https://my-vault.vault.azure.net`)
- `AZURE_OPENAI_KEY_SECRET_NAME` — name of the secret that holds the OpenAI key
- `AZURE_OPENAI_ENDPOINT_SECRET_NAME` — name of the secret for the OpenAI endpoint
- `AZURE_OPENAI_VERSION_SECRET_NAME` — name of the secret for API version (e.g. `2025-01-01-preview`)
- `COMPLETION_MODEL` — Azure OpenAI deployment name used for completions (default `gpt-35-turbo`)
- `VSCODE` — set to `true` for local dev to explicitly enable `VisualStudioCodeCredential` in the Azure Identity chain, with Azure CLI auth still available as a fallback; do NOT set in production
- Optional local service principal vars: `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`

Local quickstart

1. Copy example env file:
  ```powershell
  copy backend\.env.example backend\.env
  ```
2. Edit `backend\.env` or `backend\local.settings.json` and set:
  - `KEY_VAULT_CORE_URI`, `AZURE_OPENAI_*_SECRET_NAME` values, and choose one local auth mode:
  - user auth via Azure CLI / VS Code: set `VSCODE=true`
  - service principal auth: set `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, and `AZURE_CLIENT_SECRET`
3. Sign in for `DefaultAzureCredential` when using user auth:
  ```powershell
  az login
  # or sign into Azure in VS Code
  ```
  If Key Vault requires a tenant-specific MFA-backed token, sign in with the tenant and vault scope explicitly:
  ```powershell
  az logout
  az login --tenant "<tenant-id>" --scope "https://vault.azure.net/.default"
  ```
  If browser login is awkward, use device code:
  ```powershell
  az login --tenant "<tenant-id>" --scope "https://vault.azure.net/.default" --use-device-code
  ```
4. Configure service principal auth when using app credentials instead of a user login:
  ```json
  {
    "Values": {
      "AZURE_TENANT_ID": "<tenant-id>",
      "AZURE_CLIENT_ID": "<app-registration-client-id>",
      "AZURE_CLIENT_SECRET": "<client-secret>",
      "VSCODE": "false"
    }
  }
  ```
  Create the client secret in Microsoft Entra ID:
  1. Open the target App Registration in Azure Portal.
  2. Go to `Certificates & secrets`.
  3. Select `New client secret`.
  4. Copy the generated secret value into `AZURE_CLIENT_SECRET`.
  5. Ensure that identity has permission to read secrets from the target Key Vault.
5. Start Functions host:
  ```powershell
  cd backend
  func start
  ```
6. Verify secret access quickly (Python snippet):
  ```python
  from app.services.secret_service import SecretService
  print(SecretService.get_secret_value("https://my-vault.vault.azure.net", "azure-openai-key"))
  ```

Authentication notes

- `VSCODE=true` enables developer-oriented credentials for local work. In practice, Azure CLI auth is the most reliable option for this repository.
- If only `AZURE_TENANT_ID` and `AZURE_CLIENT_ID` are set, `EnvironmentCredential` is incomplete and will not authenticate. For service principal auth you must also set `AZURE_CLIENT_SECRET`.
- `VisualStudioCodeCredential` may fail with newer Azure Account extension versions because of a known Azure SDK limitation. If that happens, prefer `az login`.
- For production hosts, do not set `VSCODE=true`; use managed identity instead.

Production notes

- Provision Key Vault secrets and do not store secret values in plain `.env` in production.
- Assign a Managed Identity to the host (App Service / VM / Function) and grant Key Vault `get` permission to that identity.
- Ensure `VSCODE` is unset or `false` in production so `ManagedIdentityCredential` is used.
- Confirm `COMPLETION_MODEL` equals your OpenAI deployment name and that the deployment exists.

Troubleshooting

- "Unauthorized" when fetching secrets: check Key Vault access policy / role assignment for the identity.
- "Could not resolve host" / network errors: verify egress rules allow access to Key Vault and OpenAI endpoints.
- Tests failing locally: most backend tests mock OpenAI and Key Vault; set `PYTHONPATH=backend` when running pytest.

Helpful commands to provision secrets (example)
```powershell
az keyvault secret set --vault-name my-vault --name azure-openai-key --value "<openai-key>"
az keyvault secret set --vault-name my-vault --name azure-openai-endpoint --value "https://my-openai-resource.openai.azure.com"
az keyvault secret set --vault-name my-vault --name azure-openai-version --value "2025-01-01-preview"
```
