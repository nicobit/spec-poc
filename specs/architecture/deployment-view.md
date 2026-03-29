# Deployment View

## Purpose

Describe the current and intended deployment topology for the `admin-portal` system.

This is a lightweight deployment reference, focused on runtime units and infrastructure relationships rather than every environment-specific detail.

## Current Deployment Directions

The repository currently supports two backend hosting directions:

1. Azure Functions adapters for production-oriented HTTP, timer, and queue-trigger entrypoints
2. ASGI runtime for container-based hosting, with Azure App Service for Containers as the first documented deployment target

The frontend is a separate web application built from the Vite-based React project.

## Runtime Topology

### Frontend

- Source: `frontend/`
- Runtime shape:
  - built static frontend assets
  - served as the user-facing web application

### Backend ASGI Runtime

- Source: `backend/runtimes/asgi/app.py`
- Container source: `backend/Dockerfile`
- Runtime entrypoint:
  - `uvicorn runtimes.asgi.app:app --host 0.0.0.0 --port 8000`
- Intended hosting targets:
  - Azure App Service for Containers
  - Azure Container Apps
  - AKS or similar container runtime in future

### Backend Azure Functions Runtime

- Source: `backend/function_*`
- Runtime shape:
  - HTTP-triggered functions
  - timer-triggered functions
  - queue-triggered functions

Important current examples:

- `function_environment`
- `function_scheduler_timer`
- `function_scheduler_worker`

## Current Azure-Oriented Deployment Model

### Foundation Resources

The documented baseline infrastructure includes:

- Storage
- Key Vault
- Application Insights

Reference:

- `backend/deployment/foundation/`

### Backend App Service Resources

Documented baseline includes:

- Linux App Service plan
- Linux Web App
- system-assigned managed identity
- registry pull configuration
- backend app settings

Reference:

- `backend/deployment/appservice/`

### Access Layer

Documented baseline includes:

- managed identity role assignments for Key Vault and Storage

Reference:

- `backend/deployment/access/`

## Supporting Platform Dependencies

### Identity

- Microsoft Entra ID for authentication and authorization context

### Storage

- Azure Table Storage for audit and some table-backed feature persistence
- Azure Cosmos DB for schedule persistence and optional environment persistence
- Azure Cosmos DB as the recommended first-release durable store for stage execution records
- Azure Queue Storage for schedule execution handoff

### Observability

- Application Insights connection supported through backend app settings

## Deployment Relationships

### Backend Container Path

1. Backend image is built from `backend/Dockerfile`.
2. CI publishes the image to a container registry.
3. App Service deployment updates the web app to use the published image.
4. App settings and secret references are supplied through Azure configuration.

### Azure Functions Path

1. Azure Functions hosts HTTP, timer, and queue-triggered entrypoints.
2. Functions use storage-backed bindings and app settings.
3. Timer and worker functions coordinate through queue storage.

## Configuration Model

The backend expects app settings for:

- identity
- Key Vault
- OpenAI and other feature integrations
- database and storage settings
- observability
- feature behavior

Reference:

- `docs/standards/platform/backend-app-settings.md`

## Current Deployment Observations

- Azure Functions remain important because the Environments domain currently uses timer and queue trigger behavior.
- The ASGI runtime is the main portability path for container-based hosting.
- The repository intentionally preserves both directions so the spec layer can outlive a hosting transition.
- Some backend subapps are aggregated into the ASGI runtime shell, but not every Functions surface is necessarily represented there yet.

## Practical Summary

| Runtime Unit | Current Role | Current Preferred Hosting Direction |
| --- | --- | --- |
| Frontend web app | User-facing portal UI | static web hosting or equivalent frontend hosting |
| Backend ASGI runtime | unified HTTP runtime outside Functions | Azure App Service for Containers |
| Backend Functions HTTP adapters | production-oriented feature endpoints | Azure Functions |
| Scheduler timer | due schedule detection | Azure Functions timer trigger |
| Scheduler worker | queue-driven schedule execution | Azure Functions queue trigger |
| Storage services | persistence and queue handoff | Azure Storage and Cosmos DB |
| Key Vault and App Insights | secrets and observability | Azure managed services |

## Likely Next Documentation Steps

- add environment-specific or domain-specific dynamic views for:
  - schedule execution
  - environment lifecycle orchestration
- update this deployment view when the ASGI runtime absorbs more feature surfaces or when the production hosting direction changes materially
