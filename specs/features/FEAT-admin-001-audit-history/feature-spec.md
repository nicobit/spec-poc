# FEAT-admin-001 — App Audit & Execution History Dashboard

Summary
- Provide an app-level Audit & Execution History Dashboard that surfaces domain actions, manual lifecycle executions, and schedule/run history with filtering, details, and export.
- Avoid overlap with Azure Portal by focusing on product/domain-level events (who changed app data, manual environment stage lifecycle, schedule postponements), not infra telemetry or Azure Activity Logs.

Why
- Security & compliance: trace who changed roles, environments, schedules, or stage configurations.
- Operations: surface stage execution history and failed runs so operators can act without switching to cloud consoles.
- Low implementation cost: backend already has `append_audit()` and `execution_store` helpers.

Out of scope
- Azure subscription-level activity (use Azure Portal for infra changes)
- Identity provider (AAD/Okta) tenant administration

Users & Roles
- Admin: full read/export access and ability to see system-generated events.
- Auditor: read + export only (no modify).
- Environment Manager: view audits/executions for clients/environments they manage.
- System: system-generated entries (no interactive access).

User stories
- As an Admin, I can list all audit events and executions with pagination and filters (actor, client, action, resource, date range).
- As an Auditor, I can export filtered audit results to CSV for compliance reporting.
- As an Environment Manager, I can view execution history for stages I manage and inspect action details and resource action results.
- As an operator, I can click an execution entry to view detailed action results and logs (if available).

Acceptance criteria
- Backend: endpoints exist and return correct JSON (see API surface below) and enforce role checks.
- Backend: can filter by actor, client, action, resource, and date ranges; supports pagination and sorting.
- Frontend: new admin page lists audits and executions, supports filters and details view.
- Export: CSV export of filtered audit records works and includes essential fields.
- Tests: unit tests for endpoints and an integration test that ingests sample audit+execution records then verifies listing & export.

API Surface (proposed)
- GET /api/audit
  - Query: `actor`, `client`, `action`, `resourceType`, `resourceId`, `from`, `to`, `page`, `per_page`, `sort`
  - Response: list of `AuditRecord` with pagination metadata
- GET /api/audit/{id}
  - Response: `AuditRecord` detail
- GET /api/audit/export?{same filters}
  - Response: CSV file attachment
- GET /api/executions
  - Query: `stageId`, `scheduleId`, `status`, `from`, `to`, `page`, `per_page`
  - Response: list of `StageExecution` records
- GET /api/executions/{id}
  - Response: `StageExecution` detail (including `resourceActionResults`)

Data models (examples)
- AuditRecord
  - id: string
  - timestamp: ISO
  - actor: { username, id? }
  - roles: [string]
  - action: string
  - resourceType: string
  - resourceId: string
  - details: object
- StageExecution (already modeled under `backend/shared/execution_model.py`)
  - id, stageId, stageName, action, requestedAt, completedAt, status, resourceActionResults

Security & Authorization
- Require authenticated user for all endpoints.
- `admin` or `auditor` roles for read/export; environment-scoped checks allow `environment-manager` to see related entries.
- Rate-limit exports and require admin approval for large exports (optional future step).

Test plan (minimal)
- Unit tests: input validation, filter parsing, pagination, role checks for each endpoint.
- Integration test: insert sample audit entries via `append_audit()` and stage executions via `execution_store.upsert_stage_execution()`, call list endpoints and assert results and CSV export content.
- Frontend smoke: page renders list, filters apply, details modal shows execution results.

Implementation outline & next steps
1. Backend:
   - Add API handlers under `backend/function_audit` (or extend existing routes) implementing above endpoints; reuse `append_audit()` and `execution_store`.
   - Add CSV export utility.
   - Add unit & integration tests under `tests/backend`.
2. Frontend:
   - Add admin page `Admin -> Audit & Executions` with list, filters, details, and export button.
   - Use existing UI components and table pattern.
3. Documentation: update `docs/` and `specs/features/FEAT-admin-001-audit-history/test-plan.md` if needed.

Dependencies
- Existing: `backend/shared/audit_store.py`, `backend/shared/execution_store.py`, `backend/shared/execution_model.py`.

Notes
- This feature intentionally surfaces domain events: it complements but does not replace Azure / infra telemetry.

Next actions (I can do next)
- Implement backend endpoints and tests, or
- Prototype the frontend UI page and wire it to mock endpoints.

