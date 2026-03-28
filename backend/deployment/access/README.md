# Backend Access IaC

This folder contains the role-assignment template for the backend managed identity.

Files:

- `main.bicep`
- `main.parameters.example.json`

## What It Creates

- Key Vault Secrets User assignment on the backend Key Vault
- Storage Blob Data Contributor assignment on the backend Storage Account
- Storage Table Data Contributor assignment on the backend Storage Account

## Intended Use

Deploy this template after the App Service template so you can pass the Web App system-assigned identity `principalId`.

The usual order is:

1. deploy shared foundation resources
2. deploy App Service
3. deploy access role assignments
4. populate Key Vault secrets
5. configure App Service settings
6. deploy the backend image

## Example Deployment

From the repository root:

```bash
az deployment group create \
  --resource-group <resource-group> \
  --template-file backend/deployment/access/main.bicep \
  --parameters @backend/deployment/access/main.parameters.example.json
```

## Notes

- The template uses Azure built-in roles.
- If your environment needs different permissions, update the template before rollout.
- This template assumes the Key Vault uses RBAC authorization.
