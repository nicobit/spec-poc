# Backend Foundation IaC

This folder contains baseline Azure infrastructure for backend dependencies that are useful across both Azure Functions and the ASGI runtime.

Files:

- `main.bicep`
- `main.parameters.example.json`

## What It Creates

- Storage account
- Key Vault
- Log Analytics workspace
- Application Insights component

## Example Deployment

```bash
az deployment group create \
  --resource-group <resource-group> \
  --template-file backend/deployment/foundation/main.bicep \
  --parameters @backend/deployment/foundation/main.parameters.example.json
```

## Typical Next Step

After provisioning:

- populate Key Vault secrets needed by the backend
- wire App Service app settings to those resource names and secret names
- grant the backend managed identity the required access
