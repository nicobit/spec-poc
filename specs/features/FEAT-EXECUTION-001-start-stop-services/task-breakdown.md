# Task Breakdown

## Feature

`FEAT-EXECUTION-001` Start/Stop Services

## Delivery Goal

Implement the first-release orchestration path for stage `start` and `stop` actions, using:

- stage `resourceActions` configured in Environment Management
- stage schedules as the due-time source
- timer -> queue -> worker asynchronous execution
- Cosmos-backed durable `Stage Execution` persistence

## Recommended Delivery Sequence

### 1. Shared execution model

Create the shared backend execution model for:

- `StageExecution`
- `StageExecutionActionResult`

Work should include:

- Python shared model definitions
- status enum/constants
- serialization shape aligned to `api-spec.md`

### 2. Execution persistence store

Implement the first-release execution-result store.

Recommended scope:

- Cosmos-backed `stageexecutions` store
- in-memory fallback for local/test
- query methods for:
  - by `executionId`
  - latest by `stageId`
  - history by `stageId`
  - history by `scheduleId`

### 3. Queue contract hardening

Align timer and worker code to the approved queue payload contract.

Work should include:

- canonical payload fields:
  - `executionId`
  - `scheduleId`
  - `clientId`
  - `environmentId`
  - `stageId`
  - `action`
  - `requestedAt`
- ensure no duplicated Azure-service list is serialized into the queue message

### 4. Stage resolution and validation

Implement worker/runtime validation for:

- `clientId` / `environmentId` / `stageId` linkage
- loading the current stage configuration
- required `resourceActions[].properties` by type
- zero-action and unsupported-type handling

### 5. Resource action executors

Implement first-release executor behavior for:

- SQL VM lifecycle
- SQL Managed Instance lifecycle
- Synapse SQL pool start/stop
- Service Bus dispatch

Notes:

- executors should be isolated behind shared orchestration logic
- multi-subscription and multi-region handling must be action-by-action, not stage-global

### 6. Service Bus lifecycle-event dispatch

Implement the first-release lifecycle-event envelope for Service Bus dispatch.

Work should include:

- queue vs topic dispatch support
- standard envelope fields
- result recording with readable queue/topic target identifier

### 7. Immediate execution path alignment

Align immediate portal-triggered start/stop requests with the same execution/result model.

Goal:

- immediate and scheduled execution should share as much orchestration logic as practical

### 8. Audit and execution result correlation

Ensure audit/activity recording is correlated with `Stage Execution`.

Work should include:

- correlation by `executionId`
- clear linkage between audit trail and durable execution result

### 9. Portal readback endpoints

Add or refine readback endpoints for:

- latest stage execution
- stage execution history
- schedule execution history
- direct `executionId` lookup if needed

### 10. Frontend readback integration

Update environment details and schedule/history surfaces to show:

- latest known orchestration result
- recent execution history
- per-resource-action outcome summaries where appropriate

### 11. Validation and tests

Implement the approved automated coverage:

- unit tests for type-specific validation
- contract tests for queue payload and execution result shape
- integration tests for timer -> queue -> worker
- integration tests for Cosmos-backed execution persistence
- frontend tests for execution readback presentation

### 12. Operational readiness

Document and validate:

- required managed identity permissions
- Cosmos container configuration
- queue and function settings
- first-release failure semantics and retry expectations

## Ownership By Concern

- `FEAT-ENVIRONMENTS-001 Environments Management`
  - owns stage `resourceActions` authoring and schedule authoring
- `FEAT-EXECUTION-001 Start/Stop Services`
  - owns execution semantics, worker behavior, Service Bus dispatch, and durable execution records

## Suggested First Implementation Slice

The smallest meaningful delivery slice is:

1. shared `StageExecution` model
2. Cosmos/in-memory execution store
3. queue payload alignment
4. worker stage-resolution logic
5. one executor path end to end
   - recommended: `service-bus-message`

This would validate the architecture with the lowest Azure lifecycle risk before adding the remaining resource executors.
