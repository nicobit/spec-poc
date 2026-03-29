# Feature Specification

## Feature ID

`FEAT-ADMIN-004`

## Feature Name

Start/Stop Services

## Summary

Provide a dedicated orchestration capability that executes configured stage service actions for environment start and stop requests. The feature should support immediate and scheduled execution, Service Bus dispatch for downstream lifecycle handling, durable result recording, and least-privilege Azure access through managed identity.

## Goals

- Execute configured stage service actions for start and stop workflows
- Support a clear first-release boundary for Service Bus/KEDA integration
- Support resource actions across multiple subscriptions and regions
- Preserve asynchronous execution through the scheduler queue/worker pipeline
- Record durable execution results for portal visibility and auditability

## Non-Goals

- Direct AKS cluster or namespace orchestration in the first release
- SignalR/push-driven live updates in the first release
- A general-purpose workflow engine
- Multiple managed identities in the first release

## Users And Roles

- `Admin`
  - configure and trigger orchestration-capable stage services
- `EnvironmentManager`
  - configure and trigger orchestration-capable stage services
- Platform operator
  - manages Azure access, execution runtime, and operational support

## Functional Requirements

### REQ-SSS-000 Configuration ownership boundary

The supported Azure service/action types and their type-specific required properties shall be configured in Environment Management as part of stage configuration.

This feature shall consume those configured stage resource actions for execution and shall not require a separate user-facing configuration surface for the same Azure service definitions.

### REQ-SSS-001 Supported service action types

The system shall support first-release orchestration for:

- SQL VM lifecycle action
- SQL Managed Instance lifecycle action
- Synapse SQL pool start/stop action
- Service Bus message dispatch

### REQ-SSS-002 Self-contained resource action configuration

Each stage resource action shall carry the minimum self-contained data required to execute the action across subscriptions and regions.

Each resource action shall include at minimum:

- `id`
- `type`
- `subscriptionId`
- `resourceGroup`
- `region`
- `properties`

### REQ-SSS-003 Type-specific required properties

The system shall require type-specific properties before an action is considered executable.

Initial required properties:

- SQL VM
  - `vmName`
- SQL Managed Instance
  - `managedInstanceName`
- Synapse SQL pool
  - `workspaceName`
  - `sqlPoolName`
- Service Bus dispatch
  - `namespace`
  - `entityType`
  - `entityName`
  - `messageTemplate` or equivalent first-release payload contract field

### REQ-SSS-004 Service Bus dispatch boundary

When a stage action uses Service Bus dispatch, the system shall treat the Service Bus target as the controlled integration boundary.

The first release shall not require the stage action model to also identify AKS cluster or namespace targets unless direct Kubernetes orchestration is explicitly introduced as a separate supported action type.

KEDA compatibility shall be achieved by placing a message on the configured queue or topic target. The system shall not require a KEDA-specific message body shape in order to support scale-from-zero or scale-out behavior.

When the dispatch target is a topic, downstream topic subscriptions and KEDA scaler configuration remain outside this feature boundary.

### REQ-SSS-004A Service Bus target definition

The first release shall support Service Bus dispatch targets defined as either:

- queue target
- topic target

The first-release dispatch contract shall not require the orchestration runtime to identify AKS cluster or namespace details.

### REQ-SSS-004B Service Bus lifecycle-event envelope

The first-release Service Bus message payload shall use a standard lifecycle-event envelope so downstream consumers can correlate scale or lifecycle behavior to one stage execution.

The envelope shall include:

- `eventType`
- `requestedAction`
- `clientId`
- `environmentId`
- `stageId`
- `executionId`
- `requestedAt`
- `source`

It should also include:

- `scheduleId` when the source is a schedule
- `correlationId` when available

Optional display-oriented fields may include:

- `environmentName`
- `stageName`

### REQ-SSS-005 Multi-subscription and multi-region execution

The orchestration capability shall support a single stage action set that spans multiple subscriptions and Azure regions.

### REQ-SSS-006 Shared managed identity

The first release shall execute Azure operations through one shared managed identity with least-privilege rights to the required subscriptions, resources, and Service Bus namespaces.

### REQ-SSS-007 Asynchronous scheduled execution

Scheduled start/stop actions shall execute asynchronously through the queue/worker path:

1. timer identifies due action
2. queue receives execution request
3. worker performs stage action execution
4. result is written durably

### REQ-SSS-008 Immediate execution path

Immediate portal-triggered start/stop actions should align with the same orchestration execution model and durable result handling used by scheduled actions.

### REQ-SSS-009 Durable execution result recording

The system shall write a durable execution record for each start/stop request.

The record shall include:

- execution id
- environment id
- stage id
- client id
- requested action
- request source
- schedule id when applicable
- timestamps
- overall status
- per-resource-action results
- failure details when applicable

For Service Bus dispatch actions, the execution result should also record the target namespace and queue/topic entity used for the dispatched lifecycle event.

For first release, execution records should be persisted in Azure Cosmos DB as the primary durable store, with local or test-only in-memory fallback where needed.

### REQ-SSS-010 Execution status model

The system shall support execution statuses at least for:

- `pending`
- `in_progress`
- `succeeded`
- `partially_failed`
- `failed`

### REQ-SSS-011 Portal readback

The portal shall be able to retrieve the latest known orchestration result and execution history for a stage so operators can understand what happened after a start/stop request.

### REQ-SSS-012 Initial status interpretation

The first-release portal status shall represent last known orchestration state rather than guaranteed live Azure resource truth, unless explicit resource-state refresh is later implemented.

## Data Requirements

- Resource action definitions must support type-specific execution properties
- Execution records must support per-resource-action result detail
- Service Bus actions must store queue/topic dispatch target details
- Execution records must be correlated to client, environment, stage, and schedule where applicable
- Execution records should be queryable by stage, schedule, and execution id for portal readback

## Architecture Requirements

- Keep schedule evaluation separate from orchestration execution
- Preserve timer -> queue -> worker execution flow
- Avoid direct coupling of scheduling logic to Azure resource execution logic
- Keep Azure Functions triggers thin and delegate orchestration behavior into shared logic where practical
- Use one durable execution-result store for stage executions in first release instead of mixing audit-only records and ad hoc execution snapshots

## Acceptance Criteria

- The supported first-release action types are explicitly defined
- The minimum executable data required for each action type is explicitly defined
- The Service Bus/KEDA boundary is clearly defined
- The feature defines one shared managed-identity strategy for the first release
- The asynchronous execution path is explicitly defined
- The execution result model is explicitly defined
- The portal-facing status interpretation is explicitly defined

## Risks And Dependencies

- Service-specific Azure SDK/API operations are not yet fully modeled in the repository
- The downstream consumer contract for the Service Bus lifecycle-event envelope still requires final implementation agreement
- Portal lifecycle status may be misunderstood as live Azure truth if orchestration-state vs observed-state is not clearly communicated

## Assumptions

- Environment and stage configuration remain owned by the Environments feature
- The Azure service types and their required execution properties are entered and maintained inside the stage editor in Environment Management
- This feature owns orchestration execution semantics and result handling
- Reset-first rollout is acceptable while the orchestration capability is still early-stage
