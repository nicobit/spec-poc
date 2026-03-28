# Feature: Environments Management

Feature ID: FEAT-ADMIN-002

Status: Draft

Summary
-------
Provide CRUD and lifecycle management for customer environments. Environments model infrastructure stages, resource actions, schedules and notification groups. This feature removes the legacy top-level `Environment.type` field; consumers must use per-stage `resourceActions[].type` to infer any logical environment type.

Goals
-----
- Allow authorized users to create, update, list, view and delete environment records.
- Provide endpoints to start/stop an environment or an individual stage (mocked lifecycle operations).
- Provide scheduling (create/list/update/delete/postpone) of stage actions.
- Ensure the canonical model no longer contains `Environment.type` and validate payloads via `EnvironmentModel`.

Assumptions
-----------
- Authorization roles: `admin`, `environment-manager`, `client-admin` (per-client) control create/update/delete and lifecycle operations.
- Persistent storage may be Table Storage or Cosmos; an in-memory store exists for dev/tests.

Acceptance criteria
-------------------
- API contract contains no top-level `type` on `Environment`.
- Create and update endpoints validate payloads against `EnvironmentModel` and return appropriate 4xx errors on validation failure.
- Listing supports server-side filtering by `client` and `stage` and pagination; `type` filtering is removed.
- Frontend flows (create/edit) do not send `type` and derive any UI-level type from `stages[].resourceActions[].type`.
- Migration note documenting removal of `type` exists and consumers are notified.

Validation & tests
------------------
- Unit tests for create/update payload validation and uniqueness constraints.
- Integration tests for lifecycle flows (start/stop) — see `tests/backend/test_environment_lifecycle.py`.
- Add tests for any future `type` derivation logic if implemented server-side.

Migration
---------
See migration note: migration-note-remove-environment-type-2026-03-27.md. Consumers must stop sending `type` to `POST /api/environments` and `PUT /api/environments/{id}`. If a UI needs a logical type, derive it from `stages[].resourceActions[].type`.

Open questions
--------------
- Should the server provide a derived `type` for backward compatibility, or leave derivation to clients? (Prefer client-side derivation unless server-side logic is requested.)
# Feature Specification

## Feature ID

`FEAT-ADMIN-002`

## Feature Name

Environments Management

## Summary

Provide an Environments Management capability in the Admin Portal that allows authorized users to configure Azure stage resources, run immediate environment lifecycle actions, manage recurring schedules, notify environment-specific recipient groups, and allow authorized postponement of scheduled actions.

## Goals

- Allow operators to view environment stages and their lifecycle status
- Allow administrators to configure the Azure resource details required for stage orchestration
- Support coordinated start and stop workflows across multiple Azure service types
- Support recurring schedules with notification recipients per environment/stage
- Allow authorized recipients to postpone scheduled actions
- Expose auditable activity for configuration changes, execution, notifications, and postponements

## Non-Goals

- Provision Azure resources from scratch
- Replace general-purpose workflow/orchestration platforms
- Support arbitrary Azure resource types beyond the initial approved set
- Deliver every possible notification integration in the first iteration

## Users and Roles

- `Admin`
  - full configuration and operational control
- `EnvironmentManager`
  - manage environment/stage configuration, schedules, and lifecycle actions
- `AuthorizedRecipient`
  - receives notifications for a specific environment/stage and may postpone scheduled actions when policy allows

## Functional Requirements

### REQ-ENV-001 Stage inventory and status

The system shall display managed environments and their stages with current lifecycle status, resource type summary, and recent activity context.

### REQ-ENV-002 Azure stage configuration

The system shall allow `Admin` and `EnvironmentManager` users to create and update stage configuration required to execute lifecycle workflows.

### REQ-ENV-003 Supported stage action types

The system shall support stage orchestration definitions that include one or more of the following Azure action types:

- SQL VM lifecycle action
- SQL Managed Instance lifecycle action
- Synapse / data analytics SQL pool start-stop action
- Service Bus message dispatch

### REQ-ENV-004 Immediate lifecycle execution

The system shall allow `Admin` and `EnvironmentManager` users to trigger immediate start and stop workflows for a configured environment stage.

### REQ-ENV-005 Schedule management

The system shall allow `Admin` and `EnvironmentManager` users to create, update, enable, disable, and delete recurring schedules for environment stages.

### REQ-ENV-006 Notification recipient groups

The system shall allow environment/stage schedules to define the recipient group or groups to be notified before a scheduled lifecycle action executes.

### REQ-ENV-007 Notification event recording

The system shall record notification events for scheduled actions, including the schedule, targeted environment/stage, intended recipient group, and execution correlation.

### REQ-ENV-008 Postponement

The system shall allow authorized recipients, `Admin`, and `EnvironmentManager` users to postpone a scheduled action when the active postponement policy allows it.

### REQ-ENV-009 Postponement policy

The system shall support postponement policy metadata at the schedule or environment/stage level, including allowed postponement behavior and timing constraints.

### REQ-ENV-010 Activity and audit history

The system shall expose activity history for:

- configuration changes
- immediate lifecycle actions
- scheduled executions
- notifications
- postponements
- failures

### REQ-ENV-011 Authorization

The system shall enforce authorization so that:

- configuration, immediate lifecycle actions, and schedule management require `Admin` or `EnvironmentManager`
- postponement requires an authorized role or authorized notified-recipient relationship

### REQ-ENV-012 UX support

The UI shall allow authorized users to:

- view environment and stage status
- manage stage configuration
- manage schedules
- inspect activity
- understand notification and postponement state

## UI Requirements

- The application shall provide an `Environments` area in the main navigation
- The environment management experience shall include:
  - environment/stage inventory
  - stage configuration management
  - schedule management
  - activity history
  - notification/postponement context
- Users shall be able to:
  - trigger start/stop for a stage
  - inspect configured Azure resource actions
  - manage notification recipients
  - postpone eligible scheduled actions
- Loading, empty, error, and unauthorized states must be explicit

## Data and Domain Concepts

- `Environment`
  - top-level managed environment grouping
- `Stage`
  - operational unit within an environment
- `StageResourceAction`
  - Azure resource action definition used in a start/stop workflow
- `Schedule`
  - recurring action definition for a stage
- `NotificationGroup`
  - group of recipients associated with a stage or schedule
- `Postponement`
  - user-driven deferral of a scheduled action
- `ActivityEntry`
  - auditable event for configuration, execution, notification, or postponement

## Security and Authorization

- Management capabilities require `Admin` or `EnvironmentManager`
- Postponement requires explicit authorization and must be audited
- The feature must update the central authorization documentation when roles or access behavior change

## Dependencies

- Backend environment orchestration endpoints
- Scheduler worker/timer execution path
- Notification integration or notification provider abstraction
- Audit/activity persistence

## Acceptance Criteria

### AC-ENV-001

Authorized users can view environments and stages with current lifecycle state and recent activity context.

### AC-ENV-002

Authorized users can configure stage Azure resource actions for supported types:

- SQL VM
- SQL Managed Instance
- Synapse SQL pool
- Service Bus message dispatch

### AC-ENV-003

Authorized users can trigger immediate stage start and stop actions and see the resulting activity.

### AC-ENV-004

Authorized users can create and manage schedules that target an environment stage with recurrence, timezone, notification recipients, and postponement policy.

### AC-ENV-005

Notification recipient groups can be associated with an environment/stage schedule and are visible in the management experience.

### AC-ENV-006

An authorized notified user can postpone a scheduled action when policy permits, and the postponement is recorded in activity history.

### AC-ENV-007

An unauthorized user cannot configure stage actions, manage schedules, or postpone actions and receives the correct authorization response.

### AC-ENV-008

Activity history includes configuration changes, lifecycle execution, notifications, postponements, and failures.

### AC-ENV-009

The feature package includes updated API, test, and validation artifacts covering the expanded orchestration and authorization scope.

### AC-ENV-010

Authorization documentation is updated when role or permission behavior changes.

## Risks and Open Questions

- Exact Azure lifecycle semantics for SQL Managed Instance may require a design decision
- Notification channel selection may affect implementation scope and scheduling design
- Postponement policies need final business confirmation on limits and override behavior

## Traceability

- Business request: [business-request.md](business-request.md)
- Refinement: [spec-refinement.md](spec-refinement.md)
- API contract: [api-spec.md](api-spec.md)
- Test plan: [test-plan.md](test-plan.md)
- Task plan: [task-breakdown.md](task-breakdown.md)
