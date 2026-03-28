# API Specification

## Metadata

- API ID: `API-ADMIN-001`
- Related feature: `FEAT-ADMIN-001`
- Version: v1
- Status: Draft example

## Purpose

- Business purpose: provide a read-only user lookup capability for administrators
- Consumers: admin portal frontend

## Contract Summary

- Protocol: HTTPS JSON
- Base path: `/api/admin/users`
- Authentication: existing authenticated admin session
- Authorization: administrator-only access

## Endpoints

### Endpoint

- ID: `API-ADMIN-001`
- Method: `GET`
- Path: `/api/admin/users`
- Description: returns a filtered list of user summaries

#### Request

- Headers: standard auth headers
- Path parameters: none
- Query parameters:
  - `q`: optional name or email fragment
  - `limit`: optional page size for version-one bounded results
- Body schema: none

#### Response

- Success status: `200`
- Success body:

```json
{
  "items": [
    {
      "id": "user-123",
      "displayName": "Ava Admin",
      "email": "ava@example.com",
      "status": "active"
    }
  ]
}
```

- Error statuses:
  - `401`
  - `403`
  - `500`
- Error body: standard error envelope if available

## Validation Rules

- `status` must be constrained to approved values
- only approved summary fields are returned

## Compatibility

- Breaking changes: none
- Backward compatibility strategy: additive version-one endpoint

## Observability

- Logs: request outcome and correlation id
- Metrics: request count, error count, latency
- Correlation requirements: propagate correlation id through backend logs

## Test Coverage Expectations

- Contract tests: response shape and field restrictions
- Integration tests: query handling and failure behavior
- Negative tests: unauthorized access and backend failure
