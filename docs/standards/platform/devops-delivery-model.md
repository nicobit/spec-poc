# DevOps Delivery Model

This repository supports multiple possible Azure runtime targets over time. DevOps guidance should stay aligned with that portability goal.

## DevOps Responsibilities

- define CI and CD stages
- ensure quality gates are reliable
- manage packaging and deployment automation
- keep environment strategy explicit
- support rollback and release safety

## CI Expectations

CI should evolve to validate at least:

- documentation and template completeness where practical
- linting
- type checking
- unit tests
- integration and contract tests when configured
- build viability

## CD Expectations

CD should evolve to support:

- environment promotion rules
- deployment approval where required
- runtime-specific packaging
- rollback strategy
- post-deployment verification

Current container delivery guidance lives in [Container Delivery](container-delivery.md).
Azure App Service deployment guidance lives in [Azure App Service Deployment](appservice-deployment.md).
Azure App Service infrastructure guidance lives in [Azure App Service Infrastructure](appservice-infrastructure.md).
Azure App Service bootstrap guidance lives in [Azure App Service Bootstrap](appservice-bootstrap.md).
Backend runtime settings guidance lives in [Backend App Settings](backend-app-settings.md).

## Runtime Portability

The delivery model should support multiple hosting options over time, such as:

- Azure Functions
- container-based workloads
- Kubernetes
- other Azure PaaS targets

Deployment automation should avoid hard-coding assumptions that make later migration unnecessarily difficult.
