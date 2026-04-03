# Test Plan

## Scope

Validate the expanded Environments Management capability covering stage configuration, Azure resource orchestration, scheduling, notification recipients, postponement, activity history, and authorization.

## Test Objectives

- Verify client-owned environments can be browsed with clear client context
- Verify stage Azure service configuration can be created and updated correctly
- Verify immediate start/stop workflows for supported Azure action types
- Verify recurring schedules and related metadata
- Verify business-oriented schedule authoring for supported day/time patterns
- Verify notification recipients and postponement behavior
- Verify authorization boundaries
- Verify activity and audit visibility

## Test Levels

### Unit Tests

- Stage Azure service configuration validation rules
- Azure action type mapping and request validation
- Type-specific `resourceActions[].properties` validation:
  - `sql-vm`
  - `sql-managed-instance`
  - `synapse-sql-pool`
  - `service-bus-message`
- Schedule creation/update validation
- Structured recurrence to stored schedule mapping for supported patterns
- Unsupported or advanced persisted recurrence handling
- Schedule identity resolution from canonical `environmentId` and `stageId`
- Legacy schedule label-to-id resolution and ambiguous legacy rejection
- Recipient authorization evaluation
- Postponement policy validation
- Activity entry generation

### Integration Tests

- Environment API to scheduler persistence path
- Immediate start/stop orchestration flow
- Schedule execution path through timer/worker
- Notification event persistence path
- Postponement flow updates next scheduled execution correctly

### API Tests

- `GET /api/environments`
- `GET /api/environments/{environmentId}`
- `DELETE /api/environments/{environmentId}`
- `PUT /api/environments/{environmentId}/stages/{stageId}/configuration`
- `POST /api/environments/{environmentId}/stages/{stageId}/start`
- `POST /api/environments/{environmentId}/stages/{stageId}/stop`
- `GET /api/environments/schedules`
- `POST /api/environments/schedules`
- `PUT /api/environments/schedules/{scheduleId}`
- `DELETE /api/environments/schedules/{scheduleId}`
- `POST /api/environments/schedules/{scheduleId}/postpone`
- `GET /api/environments/{environmentId}/activity`

### Frontend Tests

- Environment page renders stage summaries and client context
- Authorized users can open/manage stage Azure service configuration UI
- Authorized users can create/update schedules with notification recipients
- Schedule create/edit uses action, day pattern, time, and timezone rather than requiring raw cron input
- Existing unsupported advanced recurrence values are labeled clearly and not misrepresented as simple schedules
- Renamed stages still display the current stage name on details and schedules when canonical schedule identifiers are present
- Legacy schedules that only store stage/environment labels are either resolved uniquely or surfaced as legacy/unresolved without silent rebinding
- Activity view includes notification/postponement events
- Postponement actions are shown only to eligible users
- Manage inventory page renders a single title, compact row actions, and delete confirmation for authorized users
- Manage inventory page emphasizes client ownership when listing environments
- Sidebar keeps `Environments > Manage` expanded while environment create, detail, and edit pages are open
- Create and edit forms render separate environment-details and stage/Azure-service configuration sections with a derived summary and resource-type-specific fields
- Details page renders overview cards, structured stage sections, readable schedules/activity summaries, stage lifecycle controls, and clear client ownership
- Details page visually highlights stage and schedule cards when the latest execution status is `failed` or `partially_failed`
- Schedules page behaves as a stage-level workflow and owns notifications and postponement inputs
- Error and unauthorized states are shown correctly

## Core Scenarios

1. Configure a stage with SQL VM start/stop metadata and save successfully
2. Configure a stage with Synapse SQL pool start/stop metadata and save successfully
3. Configure a stage action that dispatches a Service Bus message as part of a workflow
4. Reject a SQL VM stage action when `properties.vmName` is missing
5. Reject a SQL Managed Instance stage action when `properties.managedInstanceName` is missing
6. Reject a Synapse SQL pool stage action when `properties.workspaceName` or `properties.sqlPoolName` is missing
7. Reject a Service Bus stage action when `properties.namespace`, `properties.entityType`, `properties.entityName`, or `properties.messageTemplate` is missing
8. Accept a stage containing resource actions in different subscriptions and regions
9. Trigger immediate start for a configured stage and record successful activity
10. Trigger immediate stop for a configured stage and record successful activity
11. Create a stage-level schedule with recipient groups and postponement policy
12. Create a stage-level weekday schedule using action, time, and timezone inputs and verify the human-readable summary
13. Create a stage-level selected-days schedule and verify day-of-week validation
14. Load an existing schedule whose stored recurrence is outside the supported simple builder model and verify it is labeled as advanced or unsupported
15. Notification event is recorded before scheduled execution
16. Authorized notified user postpones a scheduled action successfully
17. Unauthorized user attempts postponement and receives correct denial
18. Activity view displays configuration, notification, postponement, and execution events
19. Authorized user deletes an environment from the manage list and the list refreshes without repeating the page title
20. A user can understand from the UI that stage Azure services are configured in create/edit, while timing, notifications, and postponement are managed in schedules
21. Rename a stage after creating a schedule and verify the schedule still appears under the correct stage using canonical identifiers
22. Attempt to update a legacy schedule whose label-based stage reference is ambiguous and verify the system rejects the change clearly

## Authorization Validation

- `Admin` can configure stages, run lifecycle actions, and manage schedules
- `EnvironmentManager` can configure stages, run lifecycle actions, and manage schedules
- Authorized notified recipients can postpone only the schedules they are entitled to act on
- Non-authorized authenticated users cannot manage configuration or postpone actions
- No route in this feature becomes public

## Regression Coverage

- Existing environment inventory view still loads
- Existing start/stop flows continue to work for currently supported environment entries
- Existing schedule activity views remain functional after contract changes
- Navigation and page labeling continue to reflect the intended hierarchy of client, environment, stage, and schedule
- Existing schedules remain readable during the identity transition, with canonical id linkage preferred over label-based matching

## Exit Criteria

- Feature-spec acceptance criteria are mapped to automated or manual validation
- Authorization behavior is validated for positive and negative cases
- Activity/audit behavior is demonstrably captured for the new lifecycle events
