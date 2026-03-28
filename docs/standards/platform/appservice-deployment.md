# Azure App Service Deployment

This repository supports Azure App Service for Containers as the first deployment target for the backend ASGI runtime.

## Deployment Model

The backend image is built and published first, then App Service is updated to pull that image.

Source image:

- [backend/Dockerfile](../../backend/Dockerfile)

Runtime entrypoint inside the image:

- `uvicorn runtimes.asgi.app:app --host 0.0.0.0 --port 8000`

## GitHub

Deployment workflow:

- [deploy-backend-appservice.yml](../../.github/workflows/deploy-backend-appservice.yml)

Required GitHub secrets:

- `AZURE_CREDENTIALS`
- `AZURE_BACKEND_WEBAPP_NAME`
- `AZURE_BACKEND_RESOURCE_GROUP`
- `CONTAINER_REGISTRY_URL`
- `CONTAINER_REGISTRY_USERNAME`
- `CONTAINER_REGISTRY_PASSWORD`
- `BACKEND_HEALTHCHECK_URL` for post-deployment smoke checks (optional but recommended)

Optional:

- `BACKEND_IMAGE_NAME`
  - defaults to `ghcr.io/<owner>/admin-portal-backend`

## GitLab

Deployment job:

- [/.gitlab-ci.yml](../../.gitlab-ci.yml)

Required GitLab variables:

- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_BACKEND_WEBAPP_NAME`
- `AZURE_BACKEND_RESOURCE_GROUP`
- `CONTAINER_REGISTRY_URL`
- `CONTAINER_REGISTRY_USERNAME`
- `CONTAINER_REGISTRY_PASSWORD`
- `BACKEND_HEALTHCHECK_URL` for post-deployment smoke checks (optional but recommended)

Optional:

- `BACKEND_IMAGE_NAME`
  - defaults to `$CI_REGISTRY_IMAGE/backend`

## Notes

- The deployment jobs assume the App Service already exists.
- The deployment jobs do not create Azure infrastructure yet.
- The deployment jobs update the configured container image and restart the web app.
- App settings and connection secrets for the backend application itself should be managed in App Service configuration or IaC, not hard-coded in CI.
- Both GitHub and GitLab now support an optional post-deployment health check against the backend liveness endpoint.

Infrastructure provisioning guidance now lives in [Azure App Service Infrastructure](appservice-infrastructure.md).
Environment bootstrapping guidance now lives in [Azure App Service Bootstrap](appservice-bootstrap.md).
