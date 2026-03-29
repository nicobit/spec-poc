# API Specification

## Feature

`FEAT-ADMIN-004` Start/Stop Services

## Purpose

Define the execution contract for immediate and scheduled stage start/stop actions.

The core rule is:

- schedules identify **when** a stage action is due
- schedules identify the target `clientId`, `environmentId`, `stageId`, and requested action
- the execution worker resolves the Azure service/action definitions from the configured stage `resourceActions`
- schedules do **not** carry a second independent list of Azure services to execute

## Contract Boundary

This feature owns:

- execution request shape
- execution result shape
- queue payload shape between timer and worker
- runtime validation that the requested stage action can be executed from the configured stage resource actions

This feature does not own:

- stage Azure service authoring UI
- schedule authoring UI
- direct AKS/KEDA runtime contracts beyond Service Bus dispatch

## Execution Sources

### Immediate execution

Immediate execution is triggered by an authorized portal action such as:

- `POST /api/environments/control`
- or an equivalent runtime command endpoint

### Scheduled execution

Scheduled execution is triggered when:

1. the timer function evaluates due schedules
2. the timer publishes an execution request to the durable execution queue
3. the worker consumes the queue message and executes the stage action

## Canonical Identifiers

All execution requests shall use canonical identifiers:

- `clientId`
- `environmentId`
- `stageId`
- `scheduleId` when the source is a schedule

Display names such as client name, environment name, or stage name may be included for diagnostics and portal readback, but shall not be treated as canonical linkage fields.

## Stage Execution Request

### Runtime command request

Example request body:

```json
{
  "clientId": "client-001",
  "environmentId": "env-ait-dev",
  "stageId": "stage-stg",
  "action": "start",
  "source": "portal"
}
```

Required fields:

- `clientId`
- `environmentId`
- `stageId`
- `action`
- `source`

Allowed `action` values:

- `start`
- `stop`

Allowed `source` values in first release:

- `portal`
- `schedule`

Optional fields:

- `scheduleId`
- `requestedBy`
- `requestedAt`
- `correlationId`

## Scheduled Queue Payload

The timer-to-worker queue message shall contain enough data to identify the due schedule and execute the associated stage action.

Example queue payload:

```json
{
  "executionId": "exec-20260329-001",
  "source": "schedule",
  "scheduleId": "schedule-stg-start-weekdays",
  "clientId": "client-001",
  "environmentId": "env-ait-dev",
  "stageId": "stage-stg",
  "action": "start",
  "requestedAt": "2026-03-29T06:00:00Z"
}
```

Required fields:

- `executionId`
- `source`
- `scheduleId`
- `clientId`
- `environmentId`
- `stageId`
- `action`
- `requestedAt`

The queue payload shall not embed a duplicated resource-action list. The worker shall load the current stage configuration and resolve the stage `resourceActions` at execution time.

## Execution Resolution Rules

When an execution request is received, the runtime shall:

1. resolve the client, environment, and stage by canonical IDs
2. validate that the stage belongs to the specified environment and client
3. load the current stage `resourceActions`
4. validate that each configured resource action has the required properties for its type
5. execute the requested lifecycle action against the configured stage services

If the stage contains zero configured resource actions:

- the request may still create an execution record
- the overall result should clearly indicate that no executable resource actions were configured

## Supported First-Release Resource Action Types

The execution runtime shall support:

- SQL VM lifecycle
- SQL Managed Instance lifecycle
- Synapse SQL pool start/stop
- Service Bus message dispatch

The runtime shall reject or mark unsupported any stage resource action types outside the approved first-release list.

## Canonical Resource Action Schema

The execution runtime expects each stage `resourceAction` to have the following canonical shape:

```json
{
  "id": "ra-sqlvm-01",
  "type": "sql-vm",
  "subscriptionId": "sub-001",
  "resourceGroup": "rg-data-dev",
  "region": "westeurope",
  "properties": {
    "vmName": "sqlvm-dev-01"
  }
}
```

Required shared fields:

- `id`
- `type`
- `subscriptionId`
- `resourceGroup`
- `region`
- `properties`

### Required `properties` by resource action type

#### `sql-vm`

- `vmName`

#### `sql-managed-instance`

- `managedInstanceName`

#### `synapse-sql-pool`

- `workspaceName`
- `sqlPoolName`

#### `service-bus-message`

- `namespace`
- `entityType`
- `entityName`
- `messageTemplate`

The worker shall validate these type-specific properties before execution and shall fail or mark the execution appropriately when the configured stage action is incomplete.

## Service Bus Dispatch Contract

For first release, a Service Bus stage resource action shall include:

- `namespace`
- `entityType`
- `entityName`
- `messageTemplate`

Allowed `entityType` values:

- `queue`
- `topic`

The execution runtime shall treat the Service Bus entity as the direct integration boundary. It shall not require AKS cluster or namespace identifiers for first-release dispatch execution.

KEDA alignment note:

- KEDA Azure Service Bus scaling reacts to active message count on a queue or topic subscription
- the orchestration runtime therefore does not need to send a KEDA-specific payload body
- the payload contract should be designed for downstream consumer traceability and lifecycle intent

When `entityType = topic`:

- the runtime sends to the configured topic
- downstream subscriptions remain consumer/platform configuration
- the sender does not need a subscription name in order to publish to the topic

## Service Bus Lifecycle-Event Payload

The first-release `messageTemplate` should resolve to a JSON lifecycle-event envelope.

Recommended payload shape:

```json
{
  "eventType": "stage.lifecycle.requested",
  "requestedAction": "stop",
  "clientId": "client-001",
  "environmentId": "env-ait-dev",
  "stageId": "stage-stg",
  "executionId": "exec-20260329-001",
  "scheduleId": "schedule-stg-stop-weekdays",
  "requestedAt": "2026-03-29T18:00:00Z",
  "source": "schedule",
  "correlationId": "corr-20260329-001",
  "environmentName": "AIT",
  "stageName": "STG"
}
```

Required fields:

- `eventType`
- `requestedAction`
- `clientId`
- `environmentId`
- `stageId`
- `executionId`
- `requestedAt`
- `source`

Optional fields:

- `scheduleId`
- `correlationId`
- `environmentName`
- `stageName`
- `metadata`

Recommended first-release `eventType`:

- `stage.lifecycle.requested`

Allowed `requestedAction` values:

- `start`
- `stop`

The payload should remain small and stable. It should carry lifecycle intent and traceability, not attempt to embed the full stage configuration or KEDA scaler configuration.

## Execution Result Record

Each stage execution shall produce one durable execution record.

Example record:

```json
{
  "executionId": "exec-20260329-001",
  "clientId": "client-001",
  "environmentId": "env-ait-dev",
  "stageId": "stage-stg",
  "scheduleId": "schedule-stg-start-weekdays",
  "action": "start",
  "source": "schedule",
  "requestedAt": "2026-03-29T06:00:00Z",
  "startedAt": "2026-03-29T06:00:02Z",
  "completedAt": "2026-03-29T06:01:20Z",
  "status": "partially_failed",
  "resourceActionResults": [
    {
      "resourceActionId": "ra-sqlvm-01",
      "type": "sql-vm",
      "status": "succeeded"
    },
    {
      "resourceActionId": "ra-sb-01",
      "type": "service-bus-dispatch",
      "status": "failed",
      "errorCode": "dispatch_failed",
      "message": "Topic not found"
    }
  ]
}
```

Required top-level fields:

- `executionId`
- `clientId`
- `environmentId`
- `stageId`
- `action`
- `source`
- `requestedAt`
- `status`
- `resourceActionResults`

Optional top-level fields:

- `scheduleId`
- `requestedBy`
- `startedAt`
- `completedAt`
- `message`
- `correlationId`

## Stage Execution Persistence Contract

The first-release durable store for stage execution records should be Azure Cosmos DB.

Recommended first-release persistence shape:

- database:
  - `adminportal`
- container:
  - `stageexecutions`
- partition key:
  - `/clientId`

Recommended document identity:

- `id` = `executionId`

Recommended top-level stored fields:

- `id`
- `executionId`
- `clientId`
- `environmentId`
- `stageId`
- `scheduleId`
- `action`
- `source`
- `requestedAt`
- `startedAt`
- `completedAt`
- `status`
- `resourceActionResults`
- `message`
- `correlationId`
- `environmentName`
- `stageName`

Recommended indexes/query paths for first release:

- by `executionId`
- by `clientId + environmentId + stageId`
- by `scheduleId`
- by `requestedAt`
- by `status`

Local and test-only runtime may use:

- in-memory execution store

The first release should not rely on audit events alone as the durable source of execution truth.

Allowed execution statuses:

- `pending`
- `in_progress`
- `succeeded`
- `partially_failed`
- `failed`

## Per-Resource-Action Result

Each resource action result shall include:

- `resourceActionId`
- `type`
- `status`

Optional fields:

- `subscriptionId`
- `region`
- `resourceIdentifier`
- `message`
- `errorCode`
- `startedAt`
- `completedAt`

Allowed per-action statuses:

- `pending`
- `in_progress`
- `succeeded`
- `failed`
- `skipped`

For Service Bus dispatch results, `resourceIdentifier` should identify the dispatched queue or topic target in a readable form.

## Readback Contract

The portal shall be able to retrieve:

- latest known execution result for a stage
- execution history for a stage
- execution history for a schedule when applicable

The readback contract should prefer canonical identifiers and current display names resolved from the latest environment and client records.

Recommended readback endpoints or equivalent runtime queries should support:

- latest execution by `stageId`
- recent execution history by `stageId`
- recent execution history by `scheduleId`
- direct lookup by `executionId`

## Validation Rules

The runtime shall reject or fail execution when:

- `clientId`, `environmentId`, or `stageId` is missing
- the stage does not belong to the specified environment
- the environment does not belong to the specified client
- `action` is unsupported
- a configured resource action is missing required type-specific properties
- a resource action type is unsupported in the first release

## Error Semantics

Suggested first-release failure handling:

- request-level validation failure:
  - return `400` or `422`
- authorization failure:
  - return `403`
- unknown target IDs:
  - return `404`
- runtime execution failure:
  - create execution record with `failed` or `partially_failed`

## Compatibility Notes

- Schedules remain the source of recurrence and due-time evaluation
- Stage `resourceActions` remain the source of executable Azure service definitions
- The worker must load current stage configuration at execution time rather than trusting duplicated serialized service definitions from the schedule
- Audit history may continue to record execution-related events, but the durable `Stage Execution` record is the primary execution-state source
