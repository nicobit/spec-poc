# Test Plan

## Scope

Validate the first-release Client Management capability covering canonical client identity, minimum client record management, authorization, dedicated client-area behavior, logical retirement, and reset-first rollout expectations for current string-based client references used by related features.

## Test Objectives

- Verify `Client` is treated as a first-class managed entity rather than only a free-form label
- Verify the minimum first-release client record can be created, viewed, listed, and updated correctly
- Verify short code, country, timezone, and user-only client-admin email validation
- Verify authorization boundaries for client-management operations
- Verify dedicated `Clients` area expectations
- Verify logical retirement instead of hard delete
- Verify reset-first rollout expectations for related features that still carry string-based client references
- Verify the client model is suitable for reuse by environments, schedules, and future cross-domain features

## Test Levels

### Unit Tests

- Client record validation rules
- Short-code uniqueness validation
- Country validation
- Timezone validation
- Client-admin assignment validation
- Client-admin assignment type validation for user-only assignments
- Retirement-state transition validation
- Lightweight compatibility-resolution helpers where they remain intentionally supported

### API Tests

- `GET /api/clients`
- `GET /api/clients/{clientId}`
- `POST /api/clients`
- `PUT /api/clients/{clientId}`
- `POST /api/clients/{clientId}/retire`

### Integration Tests

- Client record creation persists and is retrievable through the canonical client identifier
- Logical retirement keeps the client traceable and visible according to the approved read/filter behavior
- Environment or schedule flows can resolve or reference the canonical client identity where implemented
- Audit entries are recorded for create, update, and retire operations
- Reset/recreated canonical records are handled cleanly without depending on a heavy migration path
- Any retained legacy client-reference fallback remains predictable and rejects ambiguity rather than silently rebinding

### Frontend Tests

- Dedicated `Clients` area is present and acts as the first management entry point
- Client list page renders the minimum first-release client fields clearly
- Client create/edit form supports short code, country, timezone, and user-only client-admin email ownership
- Validation errors are shown clearly for missing or invalid required fields
- The UI uses `Client` as a business entity label rather than a technical identifier concept
- Country and timezone are displayed as first-class editable client attributes
- Retirement action is clearly distinguished from deletion

## Core Scenarios

1. Create a client with display name, short code, country, timezone, and one client-admin email assignment
2. Update a client's display name and timezone successfully
3. Reject client creation when `shortCode` is missing
4. Reject client creation when `country` is missing or invalid according to the approved validation rule
5. Reject client creation when `timezone` is not a valid IANA timezone identifier
6. Reject client creation when `clientAdmins` is missing in the first release
7. Reject client creation when a duplicate `shortCode` is used
8. Reject unsupported client-admin assignment types such as groups in the first release
9. Reject invalid client-admin email values on both frontend and backend validation paths
9. Return the correct client record when retrieving by canonical `clientId`
10. Record an audit entry when a client is created
11. Record an audit entry when a client is updated
12. Logically retire a client and confirm it remains traceable rather than being hard deleted
13. Confirm the environments domain can operate with canonical `clientId`-based records after reset/recreation
14. Confirm any retained lightweight compatibility behavior for string-based client references is followed and not guessed silently
15. Attempt to resolve an ambiguous legacy client label and verify the system rejects or marks it unresolved

## Authorization Validation

- `Admin` can create, update, view, and logically retire client records
- `EnvironmentManager` can create, update, view, and logically retire client records
- Other authenticated users cannot create, update, or retire client records unless the authorization model is intentionally widened
- `ClientAdmin` ownership metadata on the client record does not automatically widen write access unless explicitly approved and implemented

## Regression Coverage

- Existing environments and schedules behavior remains understandable while the client domain becomes canonical
- Reset and recreation of early-stage data do not break the core UI flows
- Any remaining legacy string-based client labels do not silently override canonical `clientId` behavior

## Exit Criteria

- The first-release client contract fields are covered by validation scenarios
- Authorization behavior is validated for positive and negative cases
- Reset-first rollout and any retained lightweight compatibility expectations are covered
- Client-management audit expectations are covered
- Logical retirement behavior is covered instead of hard delete
