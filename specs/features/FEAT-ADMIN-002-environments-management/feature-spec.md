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

Provide an Environments Management capability in the Admin Portal that allows authorized users to manage client-owned environments, configure Azure services for each stage, run immediate stage lifecycle actions, manage stage-level recurring schedules, notify schedule recipients, and allow authorized postponement of scheduled actions.

## Goals

- Allow operators to view client-owned environments and their stages with clear ownership context
- Allow administrators to configure the Azure service details required for stage orchestration
- Support coordinated start and stop workflows across multiple Azure service types
- Support recurring schedules with notification recipients per stage
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
  - receives notifications for a specific stage schedule and may postpone scheduled actions when policy allows

## Functional Requirements

### REQ-ENV-001 Stage inventory and status

The system shall display client-owned environments and their stages with current lifecycle status, Azure service summary, and recent activity context.

### REQ-ENV-002 Azure stage configuration

The system shall allow `Admin` and `EnvironmentManager` users to create and update the Azure services linked to a stage so lifecycle workflows can execute correctly.

Environment Management shall be the user-facing configuration surface where operators define the supported Azure service/action types for each stage and enter the type-specific properties required for runtime execution.

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

The default schedule authoring flow shall use business-oriented inputs for:

- action
- supported day pattern
- time
- timezone

The UI shall not require users to author raw cron syntax as the primary interaction.

Schedules shall be linked to environments and stages by stable identifiers rather than mutable display names so later renames do not break schedule association or display.

### REQ-ENV-006 Notification recipient groups

The system shall allow stage schedules to define the recipient group or groups to be notified before a scheduled lifecycle action executes.

### REQ-ENV-007 Notification event recording

The system shall record notification events for scheduled actions, including the schedule, targeted environment/stage, intended recipient group, and execution correlation.

### REQ-ENV-008 Postponement

The system shall allow authorized recipients, `Admin`, and `EnvironmentManager` users to postpone a scheduled action when the active postponement policy allows it.

### REQ-ENV-009 Postponement policy

The system shall support postponement policy metadata at schedule level, including allowed postponement behavior and timing constraints.

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
- manage stages and their Azure services
- manage schedules
- inspect activity
- understand notification and postponement state

## UI Requirements

- The application shall provide an `Environments` area in the main navigation
- The user-facing hierarchy shall be expressed as:
  - `Client`
  - `Environment`
  - `Stage`
  - `Schedule`
- The environment management experience shall include:
  - environment/stage inventory
  - stage and Azure service configuration management
  - schedule management
  - activity history
  - notification/postponement context
- The recommended primary navigation labels shall be:
  - `Manage`
  - `Schedules`
- The recommended page labels within the environment flow shall be:
  - `Manage environments`
  - `Environment details`
  - `Edit environment`
  - `Environment schedules`
- The label `Resources` shall not remain the preferred top-level user-facing label because it does not clearly communicate the page purpose
- The label `Stage actions` shall not be preferred as a primary user-facing concept because it is too implementation-oriented for general operators
- The environment inventory page shall use a single page title and shall not repeat the page title inside nested panels
- The environment inventory page shall emphasize client ownership and make the client relationship visually primary when browsing environments
- When an environment detail, create, or edit route is open, the related `Environments > Manage` navigation group in the left sidebar shall remain expanded and visually associated with the current page
- The create and edit forms shall present environment details, stage structure, and Azure services as clearly separated concerns, and shall avoid showing derived fields as editable inputs
- The details page shall present environment overview, stage status, Azure service summaries, schedules, and recent activity in structured sections rather than raw configuration dumps as the default view
- Users shall be able to:
  - trigger start/stop for a stage
  - inspect configured Azure services for each stage
  - inspect notification recipients
  - postpone eligible scheduled actions
- The environment inventory rows shall expose details, edit, and delete actions through a compact interaction that expands on hover and keyboard focus while remaining accessible on non-hover devices
- Stage Azure service editors shall show type-specific input fields for the selected service/action instead of a single generic identifier field
- The details page shall support stage start and stop actions from within each stage section while keeping those actions visually secondary to the status and configuration overview
- The schedules experience shall be a distinct stage-level workflow and shall own:
  - recurrence
  - timezone
  - scheduled action
  - notifications
  - postponement rules
- The schedule create/edit experience shall:
  - capture schedule intent using action, day pattern, time, and timezone
  - present human-readable schedule summaries
  - avoid exposing raw cron syntax as the default user input
- The initial supported schedule patterns shall be:
  - every day
  - weekdays
  - selected day(s) of week
- If advanced or unsupported recurrence definitions exist in persisted data, the UI shall identify them clearly instead of misrepresenting them as a supported simple schedule
- The application shall not require a dedicated top-level `Resources` page in the intended user-facing information architecture; Azure service setup shall belong to the create/edit environment flow
- Loading, empty, error, and unauthorized states must be explicit

## UX Structure Recommendation

- `Manage environments`
  - primary inventory and entry point
  - browse client-owned environments
  - open details
  - create environment
  - edit environment
  - delete environment
- `Environment details`
  - read-oriented operational overview
  - summarize stage status, Azure services, schedules, notifications, and recent activity
  - provide clear entry points to edit the environment or manage schedules
- `Edit environment`
  - define environment basics
  - define stages
  - define Azure services linked to each stage
- `Environment schedules`
  - manage recurring schedules for a selected stage
  - manage schedule notifications
  - manage postponement rules
  - use a human-readable schedule builder rather than raw cron as the default authoring experience
- No dedicated `Resources` page
  - Azure service setup is handled within `Edit environment`

## Terminology Recommendation

- Preferred user-facing terms:
  - `Azure services`
  - `Stages`
  - `Schedules`
  - `Notifications`
  - `Postponement rules`
- Avoid using the following as primary navigation or section concepts unless further clarified in-product:
  - `Resources`
  - `Stage actions`
  - `Stage configuration`

## Data and Domain Concepts

- `Client`
  - business owner and primary parent context for one or more environments
- `Environment`
  - managed operational grouping under a client
- `Stage`
  - operational unit within an environment
- `StageResourceAction`
  - Azure service/action definition used in a start/stop workflow
  - authored and maintained in Environment Management
  - executed at runtime by `FEAT-ADMIN-004 Start/Stop Services`
- `Schedule`
  - recurring automation definition for a stage
- `NotificationGroup`
  - group of recipients associated with a schedule
- `Postponement`
  - user-driven deferral of a scheduled action
- `ActivityEntry`
  - auditable event for configuration, execution, notification, or postponement

## Security and Authorization

- Management capabilities require `Admin` or `EnvironmentManager`
- Postponement requires explicit authorization and must be audited
- The feature must update the central authorization documentation when roles or access behavior change

## Identity and Linkage Rules

- `Environment.id` is the canonical environment identity for API and persistence purposes
- `Stage.id` is the canonical stage identity within an environment for API and persistence purposes
- Schedule create, update, and read contracts shall use canonical `environmentId` and `stageId` linkage
- Environment and stage names in schedule payloads are display values only and must not be treated as the canonical linkage fields
- Existing legacy schedules that only contain environment or stage labels may be resolved to canonical identifiers when the match is unique
- If a legacy schedule cannot be resolved uniquely, the system shall not guess; it shall surface the record as legacy/unresolved until corrected

## Dependencies

- Backend environment orchestration endpoints
- Scheduler worker/timer execution path
- Notification integration or notification provider abstraction
- Audit/activity persistence
- `FEAT-ADMIN-004 Start/Stop Services` for execution semantics of the configured stage resource actions

## Acceptance Criteria

### AC-ENV-001

Authorized users can view client-owned environments and stages with current lifecycle state, clear client context, and recent activity context.

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

The schedule authoring flow uses business-oriented inputs for day pattern and time, and the resulting schedule is presented in a human-readable form without requiring users to understand cron syntax.

Schedules continue to point to the same environment/stage after those objects are renamed, and the UI displays the current environment/stage names rather than stale historical labels whenever canonical identifiers are available.

### AC-ENV-005

Notification recipient groups can be associated with a stage schedule and are visible in the management experience.

### AC-ENV-006

An authorized notified user can postpone a scheduled action when policy permits, and the postponement is recorded in activity history.

### AC-ENV-007

An unauthorized user cannot configure stage Azure services, manage schedules, or postpone actions and receives the correct authorization response.

### AC-ENV-008

Activity history includes configuration changes, lifecycle execution, notifications, postponements, and failures.

### AC-ENV-009

The feature package includes updated API, test, and validation artifacts covering the expanded orchestration and authorization scope.

### AC-ENV-010

Authorization documentation is updated when role or permission behavior changes.

### AC-ENV-011

The environment inventory page presents a single clear title, professional filter/action controls, and compact row actions that reveal details, edit, and delete affordances without duplicating headers or overcrowding the list.

### AC-ENV-012

The environment create and edit forms use a guided layout with separate environment details, stage workspace, and Azure-service configuration sections, while service editors display labels specific to the selected action type.

### AC-ENV-013

The environment details page uses a scan-friendly layout with overview cards, structured stage sections, readable schedule and activity summaries, clear client ownership context, and avoids presenting raw JSON as the primary content.

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
