# Container Delivery

The backend ASGI runtime supports container delivery on both GitHub and GitLab.

## Image Source

The container image is built from:

- [backend/Dockerfile](../../backend/Dockerfile)

The runtime entrypoint is:

- `uvicorn runtimes.asgi.app:app --host 0.0.0.0 --port 8000`

## GitHub

GitHub Actions builds the backend image in:

- [ci.yml](../../.github/workflows/ci.yml)

Behavior:

- pull requests: build only
- `main` / `master`: build and publish

Registry target:

- `ghcr.io/<owner>/admin-portal-backend`

Tags:

- commit SHA short tag
- `latest` on `main` / `master`

## GitLab

GitLab CI builds and publishes the backend image in:

- [.gitlab-ci.yml](../../.gitlab-ci.yml)

Behavior:

- all branches: build
- `main` / `master`: build and publish

Registry target:

- `$CI_REGISTRY_IMAGE/backend`

Tags:

- `$CI_COMMIT_SHORT_SHA`
- `latest` on `main` / `master`

## Required Credentials

GitHub:

- `GITHUB_TOKEN` with package write permission

GitLab:

- `CI_REGISTRY`
- `CI_REGISTRY_USER`
- `CI_REGISTRY_PASSWORD`
- `CI_REGISTRY_IMAGE`

## Next Deployment Step

After image publication, the next layer is environment deployment automation, for example:

- Azure App Service for Containers
- Azure Container Apps
- AKS

Those deployment jobs should consume the published image rather than rebuilding it again.

Azure App Service deployment guidance now lives in [Azure App Service Deployment](appservice-deployment.md).
