Feature: Environments Management

Summary
-------
Provide a first-class Environments Management surface in the admin portal so operators can create, view and control environments scoped to a client. Features include per-client environments (DEV, AIT, UAT, PP, PROD), user-defined stages, lifecycle controls (start/stop), scheduling, RBAC, and audit/activity history.

Goals
-----
- Allow creating environments scoped to a `client` with a canonical `name` (DEV, UAT, etc.).
- Support multiple user-defined `stages` per environment (stage IDs stable UUIDs).
- Provide APIs for listing, creating, updating environments and managing stage lifecycle actions.
- Support schedules that reference `environment_id` + `stage_id`.
- Enforce RBAC: admin, environment-manager, client-admin, viewer.
- Record auditable events for manual and scheduled actions.

Acceptance Criteria
-------------------
- Backend exposes documented API endpoints (see `api-spec.md`).
- Creating an environment validates uniqueness of `(client, name)`.
- Stages have stable `id` values; schedules reference `stage_id`.
- UI can list environments filtered by `client` and `type` and perform start/stop on stages when authorized.
- Audit entries contain environment id, stage id, actor, timestamp, action, and optional metadata.

Traceability
-----------
This feature maps to product request: Environments Management (see specs/features/1001-environments-management).
