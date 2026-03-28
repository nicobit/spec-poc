# Backend App Service IaC

This folder contains the initial Azure infrastructure-as-code for the backend App Service deployment target.

Files:

- `main.bicep`
- `main.parameters.example.json`

Related folders:

- `../foundation`
- `../access`

## What It Creates

- Linux App Service plan
- Linux Web App for the backend container
- system-assigned managed identity
- container registry settings
- application settings

## Example Deployment

From the repository root:

```bash
az deployment group create \
  --resource-group <resource-group> \
  --template-file backend/deployment/appservice/main.bicep \
  --parameters @backend/deployment/appservice/main.parameters.example.json
```

## Container Image Format

The `linuxFxVersion` parameter must use the App Service container format:

```text
DOCKER|<registry>/<image>:<tag>
```

Examples:

- `DOCKER|ghcr.io/example/admin-portal-backend:latest`
- `DOCKER|registry.gitlab.com/example-group/example-project/backend:latest`

## Notes

- The template assumes the container image already exists in the registry.
- Registry credentials are stored as app settings for App Service to pull the image.
- Application runtime settings should be passed in through the `appSettings` parameter or managed later through IaC/automation.
- Managed identity role assignments for Key Vault and Storage are handled by `../access/main.bicep`.
