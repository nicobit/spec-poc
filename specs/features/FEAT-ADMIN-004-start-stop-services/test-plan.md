# Test Plan

## Feature

`FEAT-ADMIN-004` Start/Stop Services

## Goal

Validate that immediate and scheduled stage start/stop actions execute against the Azure services configured on the stage, using the asynchronous timer -> queue -> worker path and durable execution result recording.

## Test Scope

This plan covers:

- execution request validation
- schedule-to-stage execution targeting
- worker resolution of stage `resourceActions`
- type-specific resource action validation
- execution result recording
- partial failure behavior
- multi-subscription and multi-region execution metadata

This plan does not yet cover:

- live Azure integration tests against real subscriptions
- AKS/KEDA orchestration
- SignalR or push-driven portal updates

## Test Levels

- backend unit tests
- backend contract tests
- backend integration tests
- frontend integration/readback tests where execution history is surfaced

## Core Scenarios

### TP-SSS-001 Due schedule triggers stage action

Verify that when the timer detects a due schedule:

- it produces one execution queue message
- the message contains:
  - `scheduleId`
  - `clientId`
  - `environmentId`
  - `stageId`
  - `action`
- it does not duplicate a second Azure service list

### TP-SSS-002 Worker resolves stage resource actions from stage configuration

Verify that the worker:

- loads the target stage from canonical IDs
- reads the stage `resourceActions`
- executes against those resource actions
- does not depend on a separate service list inside the schedule

### TP-SSS-003 Immediate portal action uses same execution model

Verify that an immediate `start` or `stop` request:

- resolves the same stage resource actions
- produces the same execution result structure
- aligns with the asynchronous execution/result contract

### TP-SSS-004 SQL VM required fields

Verify that a SQL VM resource action:

- executes when `vmName` is present
- fails validation when `vmName` is missing

### TP-SSS-005 SQL Managed Instance required fields

Verify that a SQL Managed Instance resource action:

- executes when `managedInstanceName` is present
- fails validation when `managedInstanceName` is missing

### TP-SSS-006 Synapse SQL pool required fields

Verify that a Synapse SQL pool resource action:

- executes when `workspaceName` and `sqlPoolName` are present
- fails validation when either required field is missing

### TP-SSS-007 Service Bus dispatch required fields

Verify that a Service Bus dispatch action:

- executes when `namespace`, `entityType`, `entityName`, and `messageTemplate` are present
- fails validation when any required field is missing
- rejects unsupported `entityType`

### TP-SSS-007A Service Bus queue dispatch payload

Verify that a queue-target dispatch:

- produces a lifecycle-event payload with the required identity fields
- records the queue target in the per-resource-action result
- does not require AKS or KEDA-specific fields

### TP-SSS-007B Service Bus topic dispatch payload

Verify that a topic-target dispatch:

- produces the same lifecycle-event envelope
- sends to the configured topic target
- does not require subscription name for publish behavior
- records the topic target in the per-resource-action result

### TP-SSS-007C KEDA compatibility assumption

Verify that the Service Bus payload contract remains independent from KEDA-specific body requirements, while preserving enough identity and lifecycle fields for downstream consumers.

### TP-SSS-008 Multi-subscription stage execution

Verify that a single stage with resource actions in different subscriptions:

- executes each action independently
- records subscription-specific result metadata

### TP-SSS-009 Multi-region stage execution

Verify that a single stage with resource actions in different regions:

- executes each action independently
- records region-specific result metadata

### TP-SSS-010 Partial failure

Verify that when one resource action succeeds and another fails:

- the overall execution status becomes `partially_failed`
- per-resource-action results show both outcomes
- the failure details remain available for portal readback

### TP-SSS-011 Empty stage resource actions

Verify that when a scheduled or immediate action targets a stage with no configured resource actions:

- an execution record is still written
- the overall result clearly indicates no executable actions were configured

### TP-SSS-012 Invalid canonical linkage

Verify that the runtime rejects execution when:

- `stageId` does not belong to `environmentId`
- `environmentId` does not belong to `clientId`

### TP-SSS-013 Unsupported resource action type

Verify that a stage containing an unsupported first-release resource action type:

- produces a clear validation or execution failure
- does not silently skip unsupported configuration unless explicitly defined as `skipped`

### TP-SSS-014 Durable execution record fields

Verify that each execution record includes:

- `executionId`
- `clientId`
- `environmentId`
- `stageId`
- `action`
- `source`
- `requestedAt`
- `status`
- `resourceActionResults`

And includes `scheduleId` when the source is a schedule.

### TP-SSS-014A Execution persistence store

Verify that the first-release runtime writes the execution record to the configured durable execution-result store and does not rely only on an audit event append.

### TP-SSS-014B Stage execution queryability

Verify that execution records can be retrieved by:

- `executionId`
- `stageId`
- `scheduleId`

with portal-oriented readback ordering by recent request time.

### TP-SSS-015 Portal readback shape

Verify that the execution history returned to the portal:

- can be correlated to the correct client, environment, and stage
- includes overall execution status
- includes per-resource-action outcomes

## Negative Tests

- unknown `clientId`
- unknown `environmentId`
- unknown `stageId`
- unsupported `action`
- missing required type-specific properties
- malformed Service Bus dispatch payload configuration

## Authorization Tests

Verify that:

- `Admin` can trigger immediate execution
- `EnvironmentManager` can trigger immediate execution
- unauthorized roles cannot trigger immediate execution

## Observability Expectations

Verify that execution logs and durable records support:

- correlation by `executionId`
- correlation to `scheduleId` when scheduled
- error details for failed resource actions
- readable identification of the Service Bus queue/topic target for dispatch actions

## Suggested Initial Automation

- unit tests for type-specific validation rules
- contract tests for queue payload shape and execution result shape
- integration tests for timer -> queue message generation
- integration tests for worker execution against mocked stage resource actions
- integration tests for Cosmos-backed stage execution persistence and query paths
- frontend tests for rendering execution history and latest known result
