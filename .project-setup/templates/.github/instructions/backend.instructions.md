---
applyTo: "backend/**,src/api/**,src/services/**,src/server/**"
---

# Backend Instructions

- Preserve stable request and response contracts unless the task explicitly includes a compatibility change.
- Validate inputs at the boundary and keep business rules in domain or service layers, not transport glue.
- Make error handling explicit and consistent with the existing backend patterns.
- Avoid hidden side effects across service boundaries.
- Be careful with auth, permissions, rate limits, retries, idempotency, and transactional behavior.
- Do not invent environment variables, secrets, queues, endpoints, or integration settings.
- If a change affects persistence or schema shape, coordinate with the data layer and tests.
- If an API contract changes, update tests and docs in the same change.
