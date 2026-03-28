# Test Plan

## Scope

Validate the expanded Environments Management capability covering stage configuration, Azure resource orchestration, scheduling, notification recipients, postponement, activity history, and authorization.

## Test Objectives

- Verify stage Azure configuration can be created and updated correctly
- Verify immediate start/stop workflows for supported Azure action types
- Verify recurring schedules and related metadata
- Verify notification recipients and postponement behavior
- Verify authorization boundaries
- Verify activity and audit visibility

## Test Levels

### Unit Tests

- Stage configuration validation rules
- Azure action type mapping and request validation
- Schedule creation/update validation
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

- Environment page renders stage summaries and configuration context
- Authorized users can open/manage stage configuration UI
- Authorized users can create/update schedules with notification recipients
- Activity view includes notification/postponement events
- Postponement actions are shown only to eligible users
- Manage inventory page renders a single title, compact row actions, and delete confirmation for authorized users
- Sidebar keeps `Environments > Manage` expanded while environment create, detail, and edit pages are open
- Create and edit forms render separate environment-details and stage-configuration sections with a derived summary and resource-type-specific fields
- Details page renders overview cards, structured stage sections, readable schedules/activity summaries, and stage lifecycle controls
- Error and unauthorized states are shown correctly

## Core Scenarios

1. Configure a stage with SQL VM start/stop metadata and save successfully
2. Configure a stage with Synapse SQL pool start/stop metadata and save successfully
3. Configure a stage action that dispatches a Service Bus message as part of a workflow
4. Trigger immediate start for a configured stage and record successful activity
5. Trigger immediate stop for a configured stage and record successful activity
6. Create a schedule with recipient groups and postponement policy
7. Notification event is recorded before scheduled execution
8. Authorized notified user postpones a scheduled action successfully
9. Unauthorized user attempts postponement and receives correct denial
10. Activity view displays configuration, notification, postponement, and execution events
11. Authorized user deletes an environment from the manage list and the list refreshes without repeating the page title

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

## Exit Criteria

- Feature-spec acceptance criteria are mapped to automated or manual validation
- Authorization behavior is validated for positive and negative cases
- Activity/audit behavior is demonstrably captured for the new lifecycle events
