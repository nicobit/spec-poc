# Dynamic View: Scheduled Stage Execution

## Purpose

Describe how a scheduled `start` or `stop` action for a stage is evaluated and executed.

This view exists to make one architectural rule explicit:

- the schedule defines **when** a stage action is due
- the stage configuration defines **what** Azure services/actions are executed

## Trigger

A stage schedule becomes due based on its configured recurrence, timezone, and requested action.

The schedule identifies:

- `scheduleId`
- `clientId`
- `environmentId`
- `stageId`
- `action`

The schedule does **not** contain a second independent Azure-services list.

## Flow

1. The operator has already configured:
   - stage `resourceActions` in Environment Management
   - a schedule for the stage action
2. The scheduler timer evaluates persisted schedules.
3. When a schedule is due, the timer emits a queue message containing:
   - `executionId`
   - `scheduleId`
   - `clientId`
   - `environmentId`
   - `stageId`
   - `action`
4. The scheduler worker consumes the queue message.
5. The worker resolves the current environment and stage configuration.
6. The worker loads the stage `resourceActions`.
7. The worker validates required type-specific properties for each configured action.
8. The worker executes the requested `start` or `stop` behavior against the configured Azure services.
9. The worker records:
   - overall execution status
   - per-resource-action results
   - audit/activity details
10. The portal reads back latest known orchestration status and history.

## Key Architectural Rule

The worker must load the current stage configuration at execution time.

This prevents drift between:

- the schedule that says a stage action is due
- the stage configuration that defines which Azure services should be started or stopped

## First-Release Execution Boundary

Supported first-release stage resource action types:

- SQL VM lifecycle
- SQL Managed Instance lifecycle
- Synapse SQL pool start/stop
- Service Bus message dispatch

For Service Bus:

- the queue or topic is the execution boundary
- downstream KEDA/AKS behavior stays outside this feature in the first release

## Persistence / Readback

Execution should produce a durable `Stage Execution` record containing:

- canonical stage/environment/client linkage
- request source
- request time and completion time
- overall execution result
- per-resource-action outcomes

The portal should treat this as last known orchestration state, not guaranteed live Azure truth.

## Follow-Up Candidates

- dynamic view for immediate stage execution
- dynamic view for schedule postponement
- refined dynamic view once the execution-result persistence implementation is finalized

