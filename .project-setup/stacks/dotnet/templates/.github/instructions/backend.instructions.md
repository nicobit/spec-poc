---
applyTo: "src/**/*.cs,backend/**/*.cs,**/*Controller.cs,**/*Endpoints.cs,**/*Service.cs"
---

# Backend Instructions

- Preserve stable API contracts unless the task explicitly includes a compatibility change.
- Keep transport concerns, validation, domain logic, and persistence concerns separated.
- Prefer clear dependency injection boundaries and avoid hidden service locator patterns.
- Be explicit about async behavior, cancellation, and error handling.
- Do not invent configuration keys, options classes, feature flags, or integration settings.
- Be careful with authorization, idempotency, retries, and transactional boundaries.
- If request or response contracts change, update tests and docs in the same change.
- If a change affects persistence shape, coordinate with migration or schema guidance.
