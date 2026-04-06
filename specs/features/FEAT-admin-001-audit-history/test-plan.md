# Test Plan — FEAT-admin-001 App Audit & Execution History

Goal
- Verify endpoints behave per API spec, enforce authorization, correctly filter/paginate, and produce CSV exports. Ensure execution history surfaces expected resource action details.

Test scope
- Unit tests for filter parsing, schema validation, and auth checks.
- Integration tests that exercise data flow using in-memory/test stores:
  - Insert sample audit records via `append_audit()`
  - Insert sample stage executions via `execution_store.upsert_stage_execution()`
  - Call list/detail/export endpoints and assert responses
- Frontend smoke test (manual or automated E2E later): list renders, filters apply, details modal shows `resourceActionResults`.

Test data
- Audit records:
  - 3 records for `clientA` by `alice` (actions: `create`, `update`, `delete`)
  - 2 records for `clientB` by `bob` (action: `update`)
  - 1 system record (actor `system`)
- Stage executions:
  - 2 executions for `stage-dev-db` (one succeeded, one failed with action results)
  - 1 execution for `stage-prod-web` failed with multiple `resourceActionResults`

Unit tests (examples)
- `test_parse_filters()` — verify `from`, `to`, `actor`, `resourceId` parsing and validation produce correct DB query params.
- `test_pagination_bounds()` — `per_page` cap enforced; negative `page` returns 400.
- `test_auth_roles()` — ensure `auditor`/`admin` can access list and export; `environment-manager` limited scope.
- `test_export_content()` — small export returns CSV with expected headers and rows for `admin`.

Integration tests (examples)
- `test_list_audits_filters()`:
  - seed sample audit records
  - GET /api/audit?client=clientA&actor=alice
  - assert returned items count and each item.client == "clientA"

- `test_get_execution_detail()`:
  - seed execution with `resourceActionResults` containing success and failure entries
  - GET /api/executions/{id}
  - assert `resourceActionResults` present and have expected schema

- `test_export_large_limit()`:
  - attempt export with >10k rows (simulate by configuring store)
  - assert 400 or a controlled error noting async requirement (MVP behavior)

Security tests
- `test_mask_pii_in_export_for_non_admin()` — insert audit with PII in details; assert CSV for `auditor` masks PII fields.
- `test_audit_logged_for_export()` — performing an export should create an audit entry referencing the actor and filters used.

Automation & running
- Tests under `tests/backend/feat_admin_001/`
- Run unit tests with existing test runner (project uses pytest — confirm) — example command:

```bash
# activate backend venv first
cd backend
pytest tests/backend/feat_admin_001 -q
```

Acceptance criteria for tests
- Unit tests pass locally in dev environment
- Integration tests pass using in-memory/test stores
- Export CSV format validated against header row and sample rows

Notes
- If CI runs against Azure resources, integration tests should default to in-memory stores unless explicit integration mode is enabled.
- Keep test data minimal and deterministic.

