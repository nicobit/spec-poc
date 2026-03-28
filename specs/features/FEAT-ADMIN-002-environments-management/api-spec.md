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

### PUT `/api/environments/{environmentId}/stages/{stageId}/configuration`

Creates or updates the Azure service configuration for a stage.

#### Request shape

- `resourceActions`
  - array of stage resource action definitions
- `notificationGroups`
  - array of recipient group definitions or references
- `postponementPolicy`
  - rules for postponement behavior

#### Supported `resourceActions[].type`

- `sql-vm`
- `sql-managed-instance`
- `synapse-sql-pool`
- `service-bus-message`

### POST `/api/environments/{environmentId}/stages/{stageId}/start`

Executes an immediate stage start workflow using the configured Azure resource actions.

### POST `/api/environments/{environmentId}/stages/{stageId}/stop`

Executes an immediate stage stop workflow using the configured Azure resource actions.

### GET `/api/environments/schedules`

Returns schedules with environment, stage, action, timezone, recipient summary, and postponement metadata.

### POST `/api/environments/schedules`

Creates a schedule for an environment stage.

#### Request shape

- `environmentId`
- `stageId`
- `action`
  - `start` or `stop`
- `recurrence`
  - cron-like or structured recurrence definition
- `timezone`
- `enabled`
- `notificationGroups`
- `notifyBeforeMinutes`
- `postponementPolicy`

### PUT `/api/environments/schedules/{scheduleId}`

Updates an existing schedule.

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
- Notification groups must be valid references or valid app-managed group definitions
- Postponement requests must satisfy the configured postponement policy
- Unauthorized recipients must receive `403`

## Error Cases

- `400` invalid configuration or invalid recurrence
- `401` unauthenticated
- `403` unauthorized role or recipient
- `404` environment, stage, or schedule not found
- `409` conflicting schedule state or invalid postponement timing
- `422` incomplete resource action configuration
