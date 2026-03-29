# Component View

## Purpose

Describe the main logical components involved in environment scheduling and stage start/stop orchestration.

This is a lightweight component view. It focuses on responsibilities and interaction boundaries rather than file-level implementation detail.

## Scope

Current repository focus:

- environment and stage configuration
- stage schedule evaluation
- asynchronous stage execution
- execution result recording
- portal readback of status and history

## Architectural Responsibility Split

The current intended split is:

- `FEAT-ADMIN-002 Environments Management`
  - owns client/environment/stage authoring
  - owns stage `resourceActions` configuration
  - owns schedule authoring and operational UX
- `FEAT-ADMIN-004 Start/Stop Services`
  - owns execution semantics for stage start/stop requests
  - owns how configured stage `resourceActions` are executed at runtime
  - owns durable execution result handling

## Main Components

### 1. Environment Management UI

- Location:
  - `frontend/src/features/environment/`
- Responsibility:
  - allow operators to define environments and stages
  - allow operators to configure stage Azure services/action types
  - allow operators to configure stage schedules
  - present stage status, activity, and schedule history

Important note:

- stage Azure services are configured here
- schedules point to a stage and requested action
- schedules do not carry their own independent Azure-service execution list

### 2. Environment API Adapter

- Location:
  - `backend/function_environment/`
- Responsibility:
  - expose environment CRUD, lifecycle, and schedule endpoints
  - validate canonical identifiers
  - delegate domain behavior into shared backend modules

### 3. Environment Domain Model

- Location:
  - `backend/shared/environment_model.py`
  - related repository/store modules
- Responsibility:
  - represent:
    - client-owned environments
    - nested stages
    - stage `resourceActions`
  - preserve the canonical structure used by execution

Important note:

- the stage is the source of executable Azure service definitions
- stage `resourceActions` are the runtime input for start/stop orchestration

### 4. Schedule Domain Model

- Location:
  - `backend/shared/schedule_model.py`
  - related repository/store modules
- Responsibility:
  - define recurrence and timing for a stage action
  - identify:
    - `clientId`
    - `environmentId`
    - `stageId`
    - requested action

Important note:

- the schedule answers `when` to act
- the stage configuration answers `what` Azure services to act on

### 5. Scheduler Timer

- Location:
  - `backend/function_scheduler_timer/`
- Responsibility:
  - evaluate due schedules
  - create durable execution requests for the queue

Important note:

- timer logic must not embed a second resource-action definition
- it emits execution requests that identify the target stage and requested action

### 6. Execution Queue Contract

- Logical boundary:
  - queue message between timer and worker
- Responsibility:
  - durable handoff of stage execution work
  - preserve canonical identity:
    - `clientId`
    - `environmentId`
    - `stageId`
    - `scheduleId`
    - `action`

### 7. Scheduler Worker / Orchestration Worker

- Location:
  - `backend/function_scheduler_worker/`
- Responsibility:
  - consume execution requests
  - resolve the current stage configuration
  - execute the configured stage `resourceActions`
  - record durable execution result state

Important note:

- the worker loads stage `resourceActions` from the current stage configuration at execution time
- it does not trust a duplicated serialized Azure-service list from the schedule

### 8. Azure Resource Action Executors

- Current conceptual component
- Responsibility:
  - execute type-specific behavior for supported action types

First-release expected executor families:

- SQL VM lifecycle executor
- SQL Managed Instance lifecycle executor
- Synapse SQL pool executor
- Service Bus dispatch executor

These may remain implementation-local at first, but they are already distinct architectural responsibilities.

### 9. Execution Result Store

- Current conceptual component
- Responsibility:
  - persist stage execution records
  - persist per-resource-action results
  - support portal history and latest-known orchestration state

### 10. Portal Readback / Activity Surface

- Location:
  - environment details, schedules, and activity pages in `frontend/src/features/environment/`
- Responsibility:
  - show latest known orchestration result
  - show execution and activity history
  - present orchestration-state knowledge rather than guaranteed live Azure truth in first release

## Key Interaction Flow

### Scheduled execution

1. Operator configures stage `resourceActions` in Environment Management.
2. Operator configures a schedule for the stage and requested action.
3. Scheduler timer finds the schedule due.
4. Timer emits a queue message identifying the stage and requested action.
5. Worker loads the current stage configuration.
6. Worker resolves and executes the stage `resourceActions`.
7. Worker records per-action and overall execution results.
8. Portal reads latest known orchestration status/history.

### Immediate execution

1. Operator triggers `start` or `stop` from the portal.
2. Backend creates an execution request using the same canonical stage identity.
3. Runtime resolves stage `resourceActions`.
4. Runtime executes and records durable results.
5. Portal reads the resulting execution status/history.

## Important Boundary Decisions

- stage Azure service configuration belongs to Environment Management
- schedule recurrence belongs to the Schedule domain
- start/stop execution semantics belong to Start/Stop Services
- Service Bus is the integration boundary for downstream KEDA/AKS handling in first release
- live Azure truth and push updates are outside the first-release core architecture

## Follow-Up Candidates

- add a dynamic view for scheduled stage execution
- add a persistence-oriented execution-result view when the execution store is finalized
- add a domain-specific component view for orchestration if executor types grow substantially

