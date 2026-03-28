# Azure App Service Infrastructure

The backend App Service deployment target now has baseline Azure infrastructure-as-code.

Template location:

- [backend/deployment/appservice/main.bicep](../../backend/deployment/appservice/main.bicep)
- [backend/deployment/foundation/main.bicep](../../backend/deployment/foundation/main.bicep)
- [backend/deployment/access/main.bicep](../../backend/deployment/access/main.bicep)

Example parameters:

- [backend/deployment/appservice/main.parameters.example.json](../../backend/deployment/appservice/main.parameters.example.json)
- [backend/deployment/foundation/main.parameters.example.json](../../backend/deployment/foundation/main.parameters.example.json)
- [backend/deployment/access/main.parameters.example.json](../../backend/deployment/access/main.parameters.example.json)

## Scope

The current template provisions:

- shared supporting resources such as Key Vault, Storage, and Application Insights
- Linux App Service plan
- Linux Web App
- system-assigned managed identity
- managed identity role assignments for Key Vault and Storage
- container registry pull settings
- backend application settings

## Deployment Flow

1. Provision foundation resources with Bicep
2. Provision the backend App Service with Bicep
3. Assign managed identity roles with Bicep
4. Populate secrets and app settings
5. Publish backend container image
6. Run GitHub or GitLab deployment job to point the app at the desired image tag

## Relationship To CI/CD

Publishing and deployment automation are documented in:

- [Container Delivery](container-delivery.md)
- [Azure App Service Deployment](appservice-deployment.md)

The Bicep template covers the infrastructure that those deployment jobs assume already exists.

See [Azure App Service Bootstrap](appservice-bootstrap.md) for the full end-to-end checklist.
