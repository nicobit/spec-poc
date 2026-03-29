# Task Breakdown

## BA-1 Business and Domain Alignment

- Confirm the first-release client record fields:
  - `clientId`
  - display name
  - short code
  - country
  - timezone
  - user-only client-admin ownership
- Confirm logical retirement instead of hard delete
- Confirm `Clients` as a dedicated top-level area separate from `Environments`

## ARCH-1 Solution Design

- Define the canonical client entity and persistence shape
- Define the reset-first rollout strategy for replacing seed and early-stage string-based client references with canonical `clientId`
- Define any lightweight approved lookup fields kept for temporary compatibility:
  - `clientId`
  - `shortCode`
  - exact display `name`
- Define unresolved/ambiguous handling for any temporary compatibility path that remains
- Align architecture data model and related feature packages that depend on client linkage

## UX-1 Experience Design

- Design the dedicated `Clients` area as a lightweight administrative surface
- Define the first-release client list page
- Define the first-release client create/edit page
- Define how retirement is presented and confirmed
- Align page structure and terminology with the existing admin UI standards
- Keep the `Clients` experience clearly separated from `Environments` while preserving the hierarchy:
  - `Client`
  - `Environment`
  - `Stage`
  - `Schedule`

## API-1 Contract Delivery

- Implement `GET /api/clients`
- Implement `GET /api/clients/{clientId}`
- Implement `POST /api/clients`
- Implement `PUT /api/clients/{clientId}`
- Implement `POST /api/clients/{clientId}/retire`
- Enforce user-only client-admin ownership in the first release
- Enforce canonical `clientId` for newly created or updated dependent records

## BE-1 Backend Delivery

- Add canonical client model and persistence
- Add validation for short code, country, timezone, and client-admin ownership
- Add retirement handling and audit events
- Add only the minimum compatibility helpers needed for temporary legacy string-based client references
- Reject ambiguous client-reference resolution instead of guessing

## FE-1 Frontend Delivery

- Add top-level `Clients` navigation entry
- Build client list page
- Build client create/edit page
- Support retirement workflow
- Render short code, country, timezone, and client-admin ownership clearly
- Keep the UI aligned with shared section/card/token patterns already established in the repo

## MIG-1 Migration and Compatibility

- Reset and recreate seed or early-stage records in canonical form
- Preserve legacy labels only where needed for display or lightweight compatibility
- Mark or reject ambiguous legacy records instead of silently rebinding
- Update environments and schedules to prefer canonical `clientId` in create/update flows

## TEST-1 Test Delivery

- Add unit tests for client validation and migration helpers
- Add API tests for list/view/create/update/retire
- Add frontend tests for dedicated `Clients` area and forms
- Add integration tests for canonical client linkage and migration behavior
- Cover ambiguous legacy reference rejection

## DOC-1 Documentation and Validation

- Update authorization/governance docs if client-admin ownership affects them
- Update architecture views if persistence or navigation materially changes
- Keep the feature validation report current with implementation evidence

## Suggested Delivery Order

- Step 1: backend client model and API contract
- Step 2: reset/recreate seed data and keep only minimum legacy-resolution behavior
- Step 3: frontend dedicated `Clients` area
- Step 4: align environments and schedules to canonical `clientId`
- Step 5: validation, documentation, and residual-risk review
