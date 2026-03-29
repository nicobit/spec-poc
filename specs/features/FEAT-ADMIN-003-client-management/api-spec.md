# API Spec: Client Management

## Overview

This feature introduces a canonical `Client` entity so environments, schedules, and future domains can reference a stable shared business identity instead of depending only on free-form client labels.

The first release should keep the contract intentionally small and administrative.

## Authorization

- Client management endpoints require authentication
- Client list, get, create, update, and retire operations require either `admin` or `environment-manager`
- `client-admin` ownership stored on the client record is business metadata in the first iteration; it should not automatically widen API write permissions unless explicitly approved in the authorization model

## UX Entry Point

- The first release should expose a dedicated `Clients` area in the application
- The API contract should support that area as the canonical management entry point for client records

## Canonical Entity

### Client

Preferred canonical fields:

- `id`
  - stable canonical client identifier
- `name`
  - human-readable display name
- `shortCode`
  - concise business key used in UI and reporting
- `country`
  - country code or approved business country value
- `timezone`
  - IANA timezone identifier
- `clientAdmins`
  - user-only client-admin ownership assignments in the first release
  - each assignment id must be a valid email address
- `retired`
  - logical retirement flag for the first release
- `retiredAt`
  - optional retirement timestamp
- `retiredBy`
  - optional actor identifier

## Endpoints

### GET `/api/clients`

Returns the list of clients available to the caller.

#### Query parameters

- `search?`
- `retired?`
- `page?`
- `per_page?`
- `sort_by?`
- `sort_dir?`

#### Response

```json
{
  "clients": [
    {
      "id": "client-001",
      "name": "Client 001",
      "shortCode": "CLIENT-001",
      "country": "CH",
      "timezone": "Europe/Zurich",
      "retired": false,
      "clientAdmins": [
        { "type": "user", "id": "nicol.bitetti@contoso.com", "displayName": "Nico Bitetti" }
      ]
    }
  ],
  "total": 1,
  "page": 0,
  "per_page": 20
}
```

Notes:

- The list response may later include derived summary fields such as environment count, but those are not required in the first contract

### GET `/api/clients/{clientId}`

Returns the full client record for the selected client.

#### Response

```json
{
  "id": "client-001",
  "name": "Client 001",
  "shortCode": "CLIENT-001",
  "country": "CH",
  "timezone": "Europe/Zurich",
  "retired": false,
  "clientAdmins": [
    { "type": "user", "id": "nicol.bitetti@contoso.com", "displayName": "Nico Bitetti" }
  ]
}
```

### POST `/api/clients`

Creates a new client.

#### Request body

```json
{
  "name": "Client 001",
  "shortCode": "CLIENT-001",
  "country": "CH",
  "timezone": "Europe/Zurich",
  "clientAdmins": [
    { "type": "user", "id": "nicol.bitetti@contoso.com" }
  ]
}
```

#### Response

```json
{
  "created": {
    "id": "client-001",
    "name": "Client 001",
    "shortCode": "CLIENT-001",
    "country": "CH",
    "timezone": "Europe/Zurich",
    "retired": false,
    "clientAdmins": [
      { "type": "user", "id": "nicol.bitetti@contoso.com", "displayName": "Nico Bitetti" }
    ]
  }
}
```

### PUT `/api/clients/{clientId}`

Updates an existing client.

Allowed mutable fields in the first release:

- `name`
- `shortCode`
- `country`
- `timezone`
- `clientAdmins`

#### Response

```json
{
  "updated": {
    "id": "client-001",
    "name": "Client 001",
    "shortCode": "CLIENT-001",
    "country": "CH",
    "timezone": "Europe/Zurich",
    "retired": false,
    "clientAdmins": [
      { "type": "user", "id": "nicol.bitetti@contoso.com", "displayName": "Nico Bitetti" }
    ]
  }
}
```

### POST `/api/clients/{clientId}/retire`

Logically retires a client instead of hard deleting it.

#### Request body

```json
{
  "reason": "Client no longer active"
}
```

#### Response

```json
{
  "updated": {
    "id": "client-001",
    "name": "Client 001",
    "shortCode": "CLIENT-001",
    "country": "CH",
    "timezone": "Europe/Zurich",
    "retired": true,
    "retiredAt": "2026-03-29T12:00:00Z",
    "retiredBy": "nicol.bitetti@contoso.com",
    "clientAdmins": [
      { "type": "user", "id": "nicol.bitetti@contoso.com", "displayName": "Nico Bitetti" }
    ]
  }
}
```

Notes:

- Hard delete is not part of the first-release contract
- Retired clients should remain traceable for linked records and historical reporting

## Sub-Models

### Client Admin Assignment

The first contract supports explicit user assignments only.

Shape:

```json
{
  "type": "user",
  "id": "nicol.bitetti@contoso.com",
  "displayName": "Nico Bitetti"
}
```

Group assignments are out of scope for the first release and must be rejected explicitly.

## Validation Rules

- `name` is required
- `shortCode` is required
- `country` is required
- `timezone` is required and must be a valid IANA timezone identifier
- `clientAdmins` is required in the first release
- `shortCode` must be unique across clients
- `name` should be unique or subject to a clearly documented uniqueness rule
- `clientAdmins` assignments must use the supported assignment type `user`
- `clientAdmins[].id` must be a valid email address
- group assignments must be rejected explicitly in the first release rather than silently accepted
- retirement must use the dedicated retirement flow rather than hard delete

## Compatibility Notes

- New contracts shall prefer `clientId` for linkage
- Human-readable client labels shall remain available for display only, or for lightweight transitional lookup where needed in development/test scenarios
- The initial rollout assumes seed and early-stage content can be reset and recreated in canonical form
- If any temporary label-based resolution is retained, approved lookup fields should be limited to:
  - `clientId`
  - `shortCode`
  - exact display `name`
- Ambiguous matches must still be rejected or surfaced as unresolved rather than silently rebound
- The product should avoid building a long-lived dual-write or migration-heavy compatibility layer unless later rollout constraints require it

## Error Cases

- `400` invalid request shape or invalid timezone/country/admin assignment
- `400` ambiguous or unresolved legacy client label during transition
- `401` unauthenticated
- `403` forbidden
- `404` client not found
- `409` duplicate short code or other uniqueness conflict

## Observability Notes

Client-management changes should emit audit/activity events that at minimum capture:

- operation type
- affected client id
- affected client short code/name
- requested by
- timestamp
- changed fields summary for update operations
- retirement reason and retirement actor for logical retirement
