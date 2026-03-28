---
name: backend-appservice-bootstrap
description: Maintain backend App Service bootstrap and deployment guidance, especially when changes affect foundation resources, managed identity access, or GitHub and GitLab delivery alignment.
---

---
name: backend-appservice-bootstrap
description: Maintain backend App Service bootstrap and deployment guidance, especially when changes affect foundation resources, managed identity access, or GitHub and GitLab delivery alignment.
---

# Backend App Service Bootstrap

Use this skill when working on backend deployment, Azure bootstrap, or managed identity access.

## Goals

- keep GitHub and GitLab deployment flows aligned
- keep App Service, foundation, and access IaC consistent
- preserve the documented bootstrap order

## Checklist

1. Check whether the change affects foundation resources, App Service IaC, access-role IaC, or CI/CD.
2. Update both GitHub and GitLab guidance when deployment behavior changes.
3. Keep required secrets and variables documented.
4. Update the bootstrap checklist if provisioning order or prerequisites change.

## Read First

- `docs/standards/platform/appservice-bootstrap.md`
- `docs/standards/platform/appservice-deployment.md`
- `docs/standards/platform/appservice-infrastructure.md`
- `backend/deployment/foundation/README.md`
- `backend/deployment/appservice/README.md`
- `backend/deployment/access/README.md`

