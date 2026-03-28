# API Spec (archived)

This file contains the archived API surface for the Environments Management feature.

Endpoints (summary)
- `GET /api/environments` — list environments
- `POST /api/environments` — create environment
- `GET /api/environments/{id}` — get environment
- `PUT /api/environments/{id}` — update environment
- `DELETE /api/environments/{id}` — delete environment
- `POST /api/environments/{id}/stages/{stage_id}/actions` — perform lifecycle actions

Note: This is an archived copy kept for traceability after refactor and removal of the environment-level `type` property.
