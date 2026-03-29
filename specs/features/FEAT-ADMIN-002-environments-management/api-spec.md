# API Spec: Environments Management

Canonical model notes
- `Environment` no longer includes a top-level `type` field. Derive any logical type from `stages[].resourceActions[].type`.

Endpoints
---------

GET /api/environments
- Query: `client?`, `stage?`, `page?` (0-based), `per_page?` (max 10), `sort_by?`, `sort_dir?`
- Response: `{ environments: EnvInstance[], total: number, page: number, per_page: number }`

GET /api/environments/{id}
- Response: `EnvInstance` with optional `schedules` and `activity` sections. Server MAY attach a derived `type` only if server-side derivation is implemented; otherwise clients derive.

POST /api/environments
- Body: partial `EnvInstance` (see model below). Server validates against canonical `EnvironmentModel` and returns `{ created: EnvInstance }`.
- Authorization: `admin` | `environment-manager` | `client-admin` for target `client`.

PUT /api/environments/{id}
- Body: partial `EnvInstance` with allowed fields `name`, `region`, `client`, `stages`.
- Response: `{ updated: EnvInstance }`.
- Authorization: `admin` | `environment-manager` | `client-admin` for existing environment's client.

DELETE /api/environments/{id}
- Response: `{ deleted: string }`.
- Authorization: `admin` | `environment-manager` | `client-admin` for existing environment's client.

POST /api/environments/{id}/start
POST /api/environments/{id}/stop
- Mock lifecycle endpoints. Return status and stage info. Authorization as above.

Stage lifecycle
POST /api/environments/{envId}/stages/{stageId}/start
POST /api/environments/{envId}/stages/{stageId}/stop

Schedules
GET /api/environments/schedules
POST /api/environments/schedules
PUT /api/environments/schedules/{schedule_id}
DELETE /api/environments/schedules/{schedule_id}
POST /api/environments/schedules/{schedule_id}/postpone

Models (summary)
- EnvInstance: { id, name, status?, region?, client?, lifecycle?, stages: EnvironmentStage[] }
- EnvironmentStage: { id, name, status, resourceActions: ResourceAction[], notificationGroups: NotificationGroup[], postponementPolicy? }
- ResourceAction: union types described in frontend/api.ts (e.g. `sql-vm`, `sql-managed-instance`, `synapse-sql-pool`, `service-bus-message`)

Validation rules
- Server must validate payloads with `EnvironmentModel` (Pydantic) before persisting.
- Uniqueness: (client, name) unique. Return `409` on conflict.

Error responses
- 400: validation errors (include Pydantic error details)
- 403: forbidden
- 404: not found
- 409: conflict

Examples
POST /api/environments
Request body
{
  "client": "client-a",
  "name": "dev-42",
  "stages": [
    {
      "id": "stage-1",
      "name": "default",
      "resourceActions": [ { "type": "sql-vm", "subscriptionId": "sub-1" } ]
    }
  ]
}

Response
{
  "created": { /* EnvInstance */ }
}

Notes
-----
- The API spec intentionally omits top-level `type`. If server-side derived `type` is later added, it must be documented and unit-tested; until then clients derive as needed.
# API Specification

## Overview

This feature extends environment management APIs to support stage configuration, multi-resource orchestration, scheduling, notification recipients, postponement, and activity history.

## Authorization

- Management endpoints require `admin` or `environment-manager`
- Postponement endpoints require either:
  - `admin`
  - `environment-manager`
  - an authorized notified recipient for the targeted environment/stage and scheduled action
- No endpoints in this feature are public

## Endpoints

### GET `/api/environments`

Returns environment and stage summaries, including lifecycle status and high-level configuration availability.

### GET `/api/environments/{environmentId}`

Returns environment details, including stages and current orchestration configuration summary.

### DELETE `/api/environments/{environmentId}`

Deletes an environment record and records an audit event for the deletion request.

### PUT `/api/environments/{environmentId}/stages/{stageId}/configuration`

Creates or updates the Azure services linked to a stage.

#### Request shape

- `resourceActions`
  - array of stage Azure service/action definitions

Notes
- This endpoint is intended to own stage service setup
- Notification groups and postponement policy should primarily be managed as part of schedule configuration unless explicit stage-level defaults are later approved

#### Supported `resourceActions[].type`

- `sql-vm`
- `sql-managed-instance`
- `synapse-sql-pool`
- `service-bus-message`

#### Canonical stage `resourceAction` shape

Each configured stage resource action should include:

- `id`
- `type`
- `subscriptionId`
- `resourceGroup`
- `region`
- `properties`

The `properties` object is type-specific and is the canonical place for execution-required fields.

#### Required `properties` by `resourceActions[].type`

##### `sql-vm`

Required:

- `vmName`

Recommended optional fields:

- `resourceId`

##### `sql-managed-instance`

Required:

- `managedInstanceName`

Recommended optional fields:

- `resourceId`

##### `synapse-sql-pool`

Required:

- `workspaceName`
- `sqlPoolName`

Recommended optional fields:

- `resourceId`

##### `service-bus-message`

Required:

- `namespace`
- `entityType`
  - `queue` or `topic`
- `entityName`
- `messageTemplate`

Recommended optional fields:

- `contentType`
- `applicationProperties`
- `sessionIdTemplate`

Notes:

- `service-bus-message` is the stage resource action name already used in Environment Management
- at execution time this maps to the Service Bus dispatch action handled by `FEAT-ADMIN-004 Start/Stop Services`
- for `entityType = topic`, downstream subscriptions remain outside the stage configuration contract

### POST `/api/environments/{environmentId}/stages/{stageId}/start`

Executes an immediate stage start workflow using the configured Azure resource actions.

### POST `/api/environments/{environmentId}/stages/{stageId}/stop`

Executes an immediate stage stop workflow using the configured Azure resource actions.

### GET `/api/environments/schedules`

Returns schedules with client, environment, stage, action, timezone, recipient summary, and postponement metadata.

Canonical response identity fields should include:

- `environmentId`
- `stageId`

Display fields may additionally include:

- `environment`
- `stage`

Notes
- `environment` and `stage` are display-oriented labels and legacy compatibility fields
- clients should use `environmentId` and `stageId` for matching, routing, and update/delete workflows

### POST `/api/environments/schedules`

Creates a schedule for an environment stage.

#### Request shape

- `environmentId`
- `stageId`
- `action`
  - `start` or `stop`
- `recurrence`
  - structured recurrence definition for supported simple schedules
- `timezone`
- `enabled`
- `notificationGroups`
- `notifyBeforeMinutes`
- `postponementPolicy`

Notes
- A schedule is a stage-level concept, even if the UI enters the workflow from an environment context
- `environmentId` and `stageId` are the canonical linkage fields for schedules
- the existing `Environment.id` and `Stage.id` values are sufficient for this purpose; no additional external-id layer is required by this feature
- Notification recipients and postponement policy should be considered schedule-owned behavior by default
- The default frontend contract should prefer a structured recurrence payload that can represent:
  - every day
  - weekdays
  - selected day(s) of week
  - a single execution time
- If the backend persists cron or cron-like expressions, that representation should be treated as an internal storage concern or an advanced-mode concern, not the primary user-authored input
- Existing schedules that cannot be mapped cleanly into the supported structured recurrence model should be returned with enough metadata for the UI to label them as advanced or unsupported
- If existing schedules only contain legacy `environment` or `stage` labels, the backend may resolve them to canonical identifiers when the match is unique
- If a legacy schedule cannot be resolved uniquely, the backend should reject ambiguous mutation requests and the UI should surface the schedule as legacy/unresolved rather than silently rebinding it

### PUT `/api/environments/schedules/{scheduleId}`

Updates an existing schedule.

The update contract shall continue to accept canonical `environmentId` and `stageId` references and shall validate that the targeted stage belongs to the targeted environment.

### DELETE `/api/environments/schedules/{scheduleId}`

Deletes a schedule.

### POST `/api/environments/schedules/{scheduleId}/postpone`

Postpones the next scheduled execution when the caller is authorized by role or recipient assignment.

#### Request shape

- `postponeUntil` or `postponeByMinutes`
- `reason`

### GET `/api/environments/{environmentId}/activity`

Returns activity entries for the selected environment, including:

- configuration changes
- immediate lifecycle actions
- schedule execution events
- notifications sent
- postponements
- execution failures

## Validation Rules

- A stage cannot be scheduled unless required Azure service configuration is present for the selected action flow
- Resource action definitions must contain the required metadata for their type
- `resourceActions[].properties` must contain the required fields for the selected `type`
- `resourceActions[].subscriptionId`, `resourceActions[].resourceGroup`, and `resourceActions[].region` are required even when different stage resource actions target different subscriptions or regions
- Schedule creation and update must validate supported day patterns, valid time values, and timezone identifiers
- Notification groups must be valid references or valid app-managed group definitions
- Postponement requests must satisfy the configured postponement policy
- Unauthorized recipients must receive `403`
- If stage-level notification or postponement defaults are later introduced, the override and inheritance model must be documented explicitly

## Error Cases

- `400` invalid configuration or invalid recurrence
- `401` unauthenticated
- `403` unauthorized role or recipient
- `404` environment, stage, or schedule not found
- `409` conflicting schedule state or invalid postponement timing
- `422` incomplete resource action configuration
- `400` ambiguous or unresolved legacy environment/stage label reference during transition

## Recurrence Shape Recommendation

For the supported simple schedule builder, the preferred request/response recurrence shape should be conceptually equivalent to:

- `pattern`
  - `daily`
  - `weekdays`
  - `selected-days`
- `daysOfWeek`
  - required when `pattern = selected-days`
- `time`
  - `HH:mm`
- `timezone`

The backend may additionally store or derive an internal cron-like expression as needed for execution, but the canonical user-facing contract should stay aligned with the business-oriented recurrence model.

## Design Notes

- Environment Management owns authoring of stage `resourceActions`
- schedules point to the stage and requested `start` or `stop` action
- the worker later resolves the configured stage `resourceActions` from the stage definition rather than from the schedule itself
