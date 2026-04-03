# Spec Refinement

## Feature

`FEAT-EXECUTION-001` Start/Stop Services

## Summary

Extract the actual Azure-service orchestration concern from the broader Environments feature into a dedicated capability that owns execution semantics for stage start and stop actions.

## Why This Is A Separate Feature

The Environments Management feature should remain focused on inventory, configuration, scheduling, and operational UX. The actual execution of start/stop actions across Azure services introduces additional concerns:

- service-specific configuration requirements
- Azure API execution semantics
- asynchronous execution flow
- execution identity and RBAC
- durable execution results
- downstream integration boundaries such as Service Bus

These concerns deserve their own feature package because they affect architecture, contracts, runtime behavior, and operational support.

## Configuration Ownership Clarified

The supported Azure service/action types and their required type-specific properties are authored in Environment Management inside each stage.

That means:

- `FEAT-ENVIRONMENTS-001 Environments Management` owns the stage authoring experience for supported Azure service types
- `FEAT-ENVIRONMENTS-001 Environments Management` owns collection and validation of the type-specific execution properties entered by users
- `FEAT-EXECUTION-001 Start/Stop Services` consumes those configured stage resource actions and defines how they are executed at runtime

This feature therefore does not introduce a separate configuration surface for Azure service definitions. It defines the executable contract that Environment Management must capture for each supported action type.

## Refined Scope

This feature should define:

1. Supported orchestration action types
2. Required per-type configuration data
3. Service Bus/KEDA boundary
4. Execution pipeline for immediate and scheduled actions
5. Managed-identity strategy
6. Execution status/result model
7. Portal-facing status/readback expectations

## Supported Action Types

The first release should support:

- SQL VM lifecycle action
- SQL Managed Instance lifecycle action
- Synapse SQL pool start/stop action
- Service Bus message dispatch

## Per-Type Configuration Direction

Each stage `resourceAction` should be self-contained and include:

- `id`
- `type`
- `subscriptionId`
- `resourceGroup`
- `region`
- `properties`

The `properties` payload should be type-specific.

Expected first-release examples:

- SQL VM
  - `vmName`
- SQL Managed Instance
  - `managedInstanceName`
- Synapse SQL pool
  - `workspaceName`
  - `sqlPoolName`
- Service Bus dispatch
  - `namespace`
  - `entityType` = `queue` or `topic`
  - `entityName`
  - `messageTemplate` or equivalent dispatch payload definition

## Service Bus Boundary

For the first release, Service Bus should be modeled as message dispatch only.

This means:

- the stage action owns the Service Bus namespace and queue/topic target
- the stage action owns the lifecycle message contract sent to the downstream consumer
- AKS cluster and namespace information should not be modeled as part of this feature unless the portal is expected to directly orchestrate Kubernetes resources

The downstream KEDA/AKS behavior should remain outside this feature boundary.

## Service Bus / KEDA Contract Direction

KEDA should be treated as reacting to message backlog on a queue or on a topic subscription, not to a special message schema.

This means:

- the portal and orchestration runtime do not need to produce a KEDA-specific payload shape just to trigger scale from zero or scale out
- a single dispatched message can be sufficient to activate downstream consumers when the consumer-side KEDA scaler is configured with appropriate `activationMessageCount` and `messageCount`
- the first-release payload contract should therefore be consumer-oriented and operationally traceable rather than KEDA-specific

For first release, the Service Bus dispatch action should support:

- queue target
  - sender dispatches directly to the configured queue
- topic target
  - sender dispatches to the configured topic
  - downstream subscriptions and KEDA scaling remain consumer/platform configuration outside this feature

The first-release message payload should use a simple lifecycle-event envelope rather than service-specific free-form text.

Recommended payload fields:

- `eventType`
- `requestedAction`
- `clientId`
- `environmentId`
- `stageId`
- `executionId`
- `scheduleId` when applicable
- `requestedAt`
- `source`
- `correlationId` when available

Optional payload fields:

- `environmentName`
- `stageName`
- `metadata`

The exact downstream business payload may evolve, but the first-release envelope should always preserve enough identity and traceability to correlate the message with one stage execution.

## Subscription And Region Handling

The orchestration model must support stage actions spanning:

- multiple subscriptions
- multiple Azure regions

No environment-level or stage-level assumption should require all actions to live in one subscription or one region.

## Managed Identity Direction

The first release should use one shared managed identity for orchestration execution.

That identity should be granted least-privilege access to:

- supported Azure resource operations in the relevant subscriptions
- Service Bus send rights where dispatch is required

Multiple identities should not be introduced in the first release unless a stronger tenant/client isolation requirement is later approved.

## Execution Pipeline Direction

The first release should preserve and strengthen the existing asynchronous execution shape:

1. Schedule timer detects a due action
2. Timer enqueues a durable execution request
3. Worker consumes the request
4. Worker executes the stage resource actions
5. Worker writes durable execution results

Immediate start/stop requests should use the same orchestration execution path where practical, so portal-triggered and scheduled actions share the same execution and result model.

## Execution Result Model

The system should record a durable execution record for each triggered start/stop request.

Recommended fields:

- execution/correlation id
- environment id
- stage id
- client id
- schedule id when applicable
- requested action
- requested time
- started time
- completed time
- overall status
- per-resource-action results
- failure details where relevant

Recommended overall statuses:

- `pending`
- `in_progress`
- `succeeded`
- `partially_failed`
- `failed`

## Portal Status Direction

The Admin Portal should initially display:

- configured stage services
- latest known orchestration result
- activity history

The initial displayed lifecycle/status should be treated as orchestration-state knowledge, not guaranteed live Azure truth.

Live resource-state inspection can be considered later as a separate enhancement.

## Initial Non-Goals Clarified

The first release should not:

- directly orchestrate AKS namespaces or workloads
- introduce SignalR or push updates to the portal
- introduce a workflow engine beyond the current timer + queue + worker model

## Recommended Naming

Feature name:

- `Start/Stop Services`

Feature package path:

- `specs/features/FEAT-EXECUTION-001-start-stop-services/`

## Relationship To Existing Features

- `FEAT-ENVIRONMENTS-001 Environments Management`
  - owns inventory, stage/service configuration, schedules, and operational UX
- `FEAT-EXECUTION-001 Start/Stop Services`
  - owns orchestration execution semantics, required service configuration, execution identity, and result handling

## Open Questions

- Should the first-release lifecycle-event envelope allow a small optional custom metadata object in addition to the standard traceability fields?
- Should immediate portal-triggered actions always enqueue work, or may some lightweight action types execute inline while still writing durable execution records?
