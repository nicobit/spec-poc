# Azure App Service Bootstrap

This checklist turns the backend App Service target into a runnable environment on Azure.

Related assets:

- [Foundation IaC](../../backend/deployment/foundation/README.md)
- [App Service IaC](../../backend/deployment/appservice/README.md)
- [Access IaC](../../backend/deployment/access/README.md)
- [Backend App Settings](backend-app-settings.md)
- [Azure App Service Deployment](appservice-deployment.md)

## Provisioning Order

1. Deploy the foundation resources:
   - [backend/deployment/foundation/main.bicep](../../backend/deployment/foundation/main.bicep)
2. Deploy the backend App Service:
   - [backend/deployment/appservice/main.bicep](../../backend/deployment/appservice/main.bicep)
3. Capture the App Service `principalId` output.
4. Deploy the backend access template:
   - [backend/deployment/access/main.bicep](../../backend/deployment/access/main.bicep)
5. Populate Key Vault with the secrets referenced by the backend app settings.
6. Apply the backend app settings to App Service.
7. Configure CI/CD secrets or variables.
8. Publish the backend image.
9. Run the deployment workflow or pipeline.
10. Verify the health endpoint and an authenticated endpoint.

## Required Azure Inputs

Before deployment, decide these values:

- Azure subscription
- resource group
- Azure region
- backend Key Vault name
- backend Storage Account name
- backend App Service plan name
- backend Web App name
- container registry URL and credentials

## Required Managed Identity Access

The App Service managed identity should normally have:

- `Key Vault Secrets User` on the backend Key Vault
- `Storage Blob Data Contributor` on the backend Storage Account
- `Storage Table Data Contributor` on the backend Storage Account

Those assignments are created by:

- [backend/deployment/access/main.bicep](../../backend/deployment/access/main.bicep)

## Key Vault Secret Population

The backend expects app settings that point to secret names. Use:

- [backend/deployment/appservice/appsettings.example.json](../../backend/deployment/appservice/appsettings.example.json)
- [Backend App Settings](backend-app-settings.md)

Typical secrets to create in Key Vault include:

- Azure OpenAI endpoint/key/version secrets
- Azure Search endpoint/key secrets
- SQL or storage connection secrets where still required by legacy modules
- database host, username, and password secrets if used in your environment

## GitHub Configuration

Required GitHub secrets for backend deployment:

- `AZURE_CREDENTIALS`
- `AZURE_BACKEND_WEBAPP_NAME`
- `AZURE_BACKEND_RESOURCE_GROUP`
- `CONTAINER_REGISTRY_URL`
- `CONTAINER_REGISTRY_USERNAME`
- `CONTAINER_REGISTRY_PASSWORD`

Recommended GitHub secrets:

- `BACKEND_HEALTHCHECK_URL`
- `BACKEND_IMAGE_NAME` if you do not want the default `ghcr.io/<owner>/admin-portal-backend`

Deployment workflow:

- [deploy-backend-appservice.yml](../../.github/workflows/deploy-backend-appservice.yml)

## GitLab Configuration

Required GitLab variables for backend deployment:

- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_BACKEND_WEBAPP_NAME`
- `AZURE_BACKEND_RESOURCE_GROUP`
- `CONTAINER_REGISTRY_URL`
- `CONTAINER_REGISTRY_USERNAME`
- `CONTAINER_REGISTRY_PASSWORD`

Recommended GitLab variables:

- `BACKEND_HEALTHCHECK_URL`
- `BACKEND_IMAGE_NAME` if you do not want the default `$CI_REGISTRY_IMAGE/backend`

Deployment pipeline:

- [/.gitlab-ci.yml](../../.gitlab-ci.yml)

## Verification

Minimum deployment verification:

1. `GET /health/healthz` returns success
2. ASGI runtime shell `GET /runtime/healthz` reports the expected feature apps
3. one authenticated backend endpoint works with a real bearer token
4. application logs show startup without configuration errors

## Notes

- Azure Functions `authLevel` remains intentionally `anonymous`; application-level authentication protects all routes except `GET /health/healthz`.
- The App Service deployment path currently assumes the infrastructure already exists and that the registry image is already published.
