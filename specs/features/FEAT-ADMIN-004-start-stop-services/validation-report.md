# Validation Report

## Feature

`FEAT-ADMIN-004` Start/Stop Services

## Scope Of This Iteration

Implemented the first backend orchestration slice:

- shared `StageExecution` model
- in-memory and Cosmos-capable execution store
- timer-issued `executionId`
- worker persistence of execution lifecycle state
- environment API readback of stage execution history and latest execution
- first real `service-bus-message` executor in the worker
- first real `sql-vm` executor in the worker
- first real `synapse-sql-pool` executor in the worker
- first real `sql-managed-instance` executor in the worker
- first frontend execution-history readback page under the environment area

## Artifacts Added

- `business-request.md`
- `spec-refinement.md`
- `feature-spec.md`
- `api-spec.md`
- `test-plan.md`
- `task-breakdown.md`
- `validation-report.md`

## Code Updated

- `backend/shared/execution_model.py`
- `backend/shared/execution_store.py`
- `backend/shared/execution_identity.py`
- `backend/shared/resource_action_contract.py`
- `backend/shared/service_bus_executor.py`
- `backend/shared/sql_managed_instance_executor.py`
- `backend/shared/sql_vm_executor.py`
- `backend/shared/synapse_sql_pool_executor.py`
- `backend/shared/environment_model.py`
- `backend/shared/environment_store.py`
- `backend/function_scheduler_timer/__init__.py`
- `backend/function_scheduler_worker/__init__.py`
- `backend/function_environment/__init__.py`
- `tests/backend/test_stage_execution.py`
- `frontend/src/features/environment/api.ts`
- `frontend/src/features/environment/pages/EnvironmentDetailsPage.tsx`
- `frontend/src/features/environment/pages/EnvironmentExecutionHistoryPage.tsx`
- `frontend/src/features/environment/components/EnvironmentSchedulesManager.tsx`
- `frontend/src/features/environment/__tests__/EnvironmentDetailsPage.test.tsx`
- `frontend/src/features/environment/__tests__/EnvironmentExecutionHistoryPage.test.tsx`
- `frontend/src/features/environment/__tests__/EnvironmentSchedulesPage.test.tsx`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/routes.test.ts`
- `frontend/src/app/navigation/sidebar-menu.tsx`
- `frontend/src/app/navigation/sidebar-menu.test.ts`

## Decisions Captured

- This is a dedicated feature with the working name `Start/Stop Services`
- The feature owns orchestration execution semantics rather than UI inventory/configuration
- Supported Azure service types and their required properties are configured inside stage editing in `FEAT-ADMIN-002 Environments Management`
- Due schedules target a stage action; execution resolves the Azure services from the configured stage `resourceActions`
- The first release supports:
  - SQL VM lifecycle
  - SQL Managed Instance lifecycle
  - Synapse SQL pool start/stop
  - Service Bus message dispatch
- Service Bus is the first-release integration boundary; AKS/KEDA remains downstream behavior outside this feature
- Service Bus dispatch uses a standard lifecycle-event envelope; KEDA compatibility depends on queue/topic backlog rather than a special payload schema
- Execution should remain asynchronous through timer -> queue -> worker
- The first release should use one shared managed identity with least privilege
- Azure Cosmos DB is the recommended first-release durable store for `Stage Execution` records
- Portal status should initially represent last known orchestration result, not guaranteed live Azure truth
- Full execution history belongs in a dedicated environment-scoped page, while the environment details page keeps only high-level status and entry-point links

## Remaining Gaps

- Cosmos-backed execution persistence is implemented structurally, but has not yet been validated against a live Cosmos environment in this iteration
- Live Azure validation is still needed for:
  - Service Bus dispatch with managed identity and real namespace/entity permissions
  - SQL VM lifecycle with managed identity and real RBAC
  - SQL Managed Instance lifecycle with managed identity and real RBAC
  - Synapse SQL pool lifecycle with managed identity and real RBAC
- The exact immediate execution/runtime path may still be refined if the repository evolves beyond the current `/api/environments/control` mock surface
- The portal now has a first dedicated execution-history page, but push/live-update behavior is still not implemented

## What To Configure For Live Testing

To validate this feature against real Azure resources, configure the following in order.

### 1. Runtime dependencies

Make sure the backend runtime that hosts:

- `function_scheduler_timer`
- `function_scheduler_worker`
- `function_environment`

has refreshed Python dependencies from:

- `backend/requirements.txt`

The current first-release executors require these libraries at runtime:

- `azure-identity`
- `azure-servicebus`
- `azure-cosmos`
- `azure-mgmt-compute`
- `azure-mgmt-sql`
- `azure-mgmt-synapse`

### 2. Shared execution identity

The first release assumes one shared execution identity for the timer/worker path.

If running in Azure:

- assign one managed identity to the worker runtime

If running locally:

- use a developer principal that has equivalent access

### 3. Minimum Azure permissions

Grant the execution identity least-privilege access for the specific target resources that will be used in the test.

Required capabilities by resource type:

- `sql-vm`
  - permission to start VM
  - permission to deallocate VM
- `sql-managed-instance`
  - permission to start managed instance
  - permission to stop managed instance
- `synapse-sql-pool`
  - permission to resume SQL pool
  - permission to pause SQL pool
- `service-bus-message`
  - `Azure Service Bus Data Sender` on the target namespace/entity path

Because stage resource actions may span multiple subscriptions and regions, permissions must exist for every subscription/resource group/namespace used by the configured stage.

### 4. Stage configuration in Environment Management

Configure the Azure services inside the stage editor in Environment Management. The schedule does not carry a separate Azure-service list.

Each stage resource action must include:

- `id`
- `type`
- `subscriptionId`
- `resourceGroup`
- `region`
- `properties`

Required `properties` per first-release type:

- `sql-vm`
  - `vmName`
- `sql-managed-instance`
  - `managedInstanceName`
- `synapse-sql-pool`
  - `workspaceName`
  - `sqlPoolName`
- `service-bus-message`
  - `namespace`
  - `entityType` = `queue` or `topic`
  - `entityName`
  - `messageTemplate`

### 5. Schedule configuration

Create a schedule for the target stage in Environment Schedules:

- choose the target `stage`
- choose `start` or `stop`
- choose day pattern / time / timezone
- ensure the schedule is enabled

The timer function is responsible for finding due schedules. When a schedule becomes due, the execution worker resolves the current stage configuration and executes that stage’s configured `resourceActions`.

### 6. Service Bus / KEDA boundary

For `service-bus-message` testing:

- configure the Service Bus queue or topic destination in the stage resource action
- verify a downstream consumer exists if you expect functional workload behavior after message dispatch

Important:

- this feature sends the lifecycle event
- KEDA reacts to queue/topic backlog
- AKS cluster / namespace details are not part of the first-release stage resource-action contract

So for first-release testing, validate:

- the message is sent successfully
- the execution result is stored correctly
- optional downstream workload behavior is observed separately

### 7. Execution-result storage

The target durable store for execution history is:

- Cosmos DB database: `adminportal`
- Cosmos DB container: `stageexecutions`
- partition key: `/clientId`

For live validation, confirm the worker can:

- create execution records
- update status through `pending` -> `in_progress` -> terminal state
- persist per-resource-action results

If Cosmos is not yet wired in the target environment, in-memory fallback may still work locally, but that is not sufficient as final live validation evidence.

### 8. Recommended first live test sequence

The safest order is:

1. Test one stage with one `service-bus-message` action
2. Test one stage with one `sql-vm` action
3. Test one mixed stage with multiple resource actions
4. Test one failure scenario to confirm `failed` / `partially_failed` readback

This reduces troubleshooting scope and proves the execution model incrementally.

### 9. What to verify in the portal

After a scheduled or manual start/stop run, verify:

- Environment Details shows latest stage execution state
- schedules show latest execution state and execution count
- Environment Execution History shows:
  - execution row
  - status
  - timestamp
  - message
  - per-resource-action results

### 10. Not required for the first live test

These can remain deferred for the initial validation pass:

- push notifications / SignalR updates
- live polling optimization
- independent readback of actual Azure resource truth after orchestration
- AKS-specific lifecycle modeling

## Recommended Test Checklist

Use this as the minimum live-validation checklist:

- backend runtime dependencies refreshed
- timer function starts cleanly
- worker function starts cleanly
- execution identity assigned
- RBAC assigned for every tested target resource
- Service Bus sender rights assigned where needed
- Cosmos DB reachable by worker
- one client created
- one environment created with canonical `clientId`
- one stage configured with valid `resourceActions`
- one enabled schedule created for that stage
- one scheduled execution completes successfully
- one execution result is visible in Environment Details
- one execution result is visible in Environment Execution History
- one failure or partial-failure scenario is validated and readable in the portal

## Validation Status

- Feature packaging and naming convention established
- Relationship to `FEAT-ADMIN-002 Environments Management` clarified
- Execution contract for due schedule -> stage action -> stage resource actions is now explicit
- Shared execution model and store are implemented
- Timer and worker queue payloads now carry `executionId`
- Worker persists execution lifecycle state and per-resource-action summaries
- Worker directly executes `service-bus-message` resource actions and records success/failure per action
- Worker directly executes `sql-vm` resource actions and records success/failure per action
- Worker directly executes `synapse-sql-pool` resource actions and records success/failure per action
- Worker directly executes `sql-managed-instance` resource actions and records success/failure per action
- Environment details now surface latest stage execution and execution history
- Environment details now surface latest stage/schedule execution state and link to execution history
- Environment execution history now has a dedicated page under `/environment/:id/executions`
- The execution-history page supports stage/status filters, expandable per-resource-action results, and client-side pagination
- Focused backend execution-readback tests now cover:
  - execution detail retrieval
  - schedule filtering
  - invalid stage/environment filter rejection
  - client-admin access for owned client execution history
  - forbidden access for non-matching client-admin
- Focused backend execution integration tests now cover:
  - timer-generated queue payload for a due schedule
  - worker persistence of a successful execution
  - worker persistence of a `partially_failed` execution
  - environment details readback of the latest execution
  - environment execution-history readback of the persisted execution
- Focused frontend execution-history tests now cover:
  - filter behavior
  - expandable per-resource-action results
  - empty state
  - load error state
  - client-side pagination
- Explicit execution readback endpoints now exist for environment-scoped and execution-scoped retrieval
- Focused validation passed via:
  - `python -m py_compile backend/shared/environment_model.py backend/shared/environment_store.py backend/shared/execution_model.py backend/shared/execution_store.py backend/shared/resource_action_contract.py backend/function_scheduler_timer/__init__.py backend/function_scheduler_worker/__init__.py backend/function_environment/__init__.py tests/backend/test_stage_execution.py`
  - `$env:PYTHONPATH='backend'; .\.venv\Scripts\python.exe -m pytest tests/backend/test_stage_execution.py`
  - `cd frontend; npx tsc --noEmit`
  - `cd frontend; npx vitest run src/features/environment/__tests__/EnvironmentExecutionHistoryPage.test.tsx src/features/environment/__tests__/EnvironmentDetailsPage.test.tsx src/features/environment/__tests__/EnvironmentSchedulesPage.test.tsx src/app/routes.test.ts src/app/navigation/sidebar-menu.test.ts`
  - direct backend FastAPI validation using `.venv\\Scripts\\python.exe` with `PYTHONPATH=backend`
  - direct worker validation for:
    - successful `service-bus-message` dispatch path
    - successful `sql-vm` execution path
    - successful `synapse-sql-pool` execution path
    - successful `sql-managed-instance` execution path
    - `partially_failed` execution outcome when Service Bus dispatch fails but delegated non-Service-Bus actions succeed

## Notes

- Backend execution tests now run successfully through `pytest` in the current `.venv`.
- Current `sql-vm` stop semantics use Azure VM deallocation rather than simple power-off, matching the likely cost-control intent of scheduled stage stop actions.
