# API Spec — FEAT-admin-001 App Audit & Execution History

Overview
- Provides read and export surfaces for application audit records and stage execution history.
- Auth: Bearer token, JWT with roles claim. All endpoints require authentication.
- Roles: `admin`, `auditor`, `environment-manager` (scoped view).

Endpoints

1) List audit records
- Method: GET
- Path: /api/audit
- Query parameters:
  - actor (string, optional) — username or partial
  - client (string, optional)
  - action (string, optional)
  - resourceType (string, optional)
  - resourceId (string, optional)
  - from (ISO datetime, optional)
  - to (ISO datetime, optional)
  - page (int, optional, default=0)
  - per_page (int, optional, default=50, max=500)
  - sort (string, optional — examples: `timestamp:desc`, `timestamp:asc`)
- Response: 200 OK
  - { total:int, page:int, per_page:int, items: AuditRecord[] }
- Authorization: `admin` or `auditor` can view all; `environment-manager` can view records related to their clients.

2) Get audit record
- Method: GET
- Path: /api/audit/{id}
- Response: 200 OK -> AuditRecord
- Authorization: same as list
- Errors: 404 Not Found if id unknown

3) Export audit CSV
- Method: GET
- Path: /api/audit/export
- Query: same as List (filters applied before exporting)
- Response: 200 OK Content-Type: text/csv; Content-Disposition: attachment; filename=audit-export-YYYYMMDD.csv
- Authorization: `admin` or `auditor` only
- Notes: enforce `per_page` limits server-side; for large exports prefer async job (future)

4) List executions
- Method: GET
- Path: /api/executions
- Query parameters:
  - stageId (string, optional)
  - scheduleId (string, optional)
  - status (string, optional — e.g., `running`, `failed`, `completed`)
  - from, to, page, per_page, sort
- Response: 200 OK -> { total, page, per_page, items: StageExecution[] }
- Authorization: `admin` or `environment-manager` for relevant clients; auditors may view read-only

5) Get execution detail
- Method: GET
- Path: /api/executions/{id}
- Response: 200 OK -> StageExecution (includes `resourceActionResults`)
- Errors: 404 Not Found

Schemas

AuditRecord (example)
- id: string
- timestamp: string (ISO8601)
- actor: object { username: string, id?: string }
- roles: string[]
- action: string
- resourceType: string
- resourceId: string
- client: string (optional)
- details: object (free-form JSON)

StageExecution
- See `backend/shared/execution_model.py` for canonical model. Key fields:
  - id, stageId, stageName, action, requestedAt, completedAt, status, resourceActionResults

Errors
- 400 Bad Request — invalid query parameters
- 401 Unauthorized — missing or invalid token
- 403 Forbidden — insufficient role
- 404 Not Found — resource not found
- 500 Internal Server Error — unexpected

Pagination convention
- `page` is 0-based. `per_page` default 50. Response includes `total`.

Filtering & Scoping rules
- Server enforces `environment-manager` scoping by restricting results to clients/environments the user manages.
- When `actor` or `resourceId` are provided, server performs case-insensitive contains search.

Security considerations
- Mask sensitive details in `details` (PII) when exporting unless `admin` role.
- Log export actions via `append_audit()` for traceability.

Rate limits and export size
- Exports limited to 10k rows in sync path. Larger exports should be an async job (not implemented in MVP).

Implementation notes
- Reuse `backend/shared/audit_store.py` and `backend/shared/execution_store.py` for data access.
- Use existing `append_audit()` for any server-side actions that modify or perform exports.
- Add unit tests for filter combinations and auth behavior.

Examples
- GET /api/audit?actor=jane&from=2026-01-01T00:00:00Z&to=2026-04-01T00:00:00Z&page=0&per_page=25
- GET /api/executions?stageId=stage-prod-web&status=failed

