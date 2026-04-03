# Business Request

## Title

Introduce start/stop services orchestration for environment stages

## Requestor

Platform and operations stakeholders

## Problem Statement

The current Environments Management feature can model stages, Azure services, and schedules, but it does not yet define a sufficiently clear orchestration capability for actually executing start and stop actions against the configured Azure services. The execution boundary is still unclear for supported service types, Service Bus-driven scale-down scenarios, execution identity, asynchronous processing, and completion/status reporting.

## Desired Outcome

Provide a dedicated Start/Stop Services capability that can orchestrate configured stage services when an immediate or scheduled start/stop action is triggered.

The capability should:

- execute the correct start or stop behavior for each configured Azure service in a stage
- support Service Bus message dispatch when the intended outcome is downstream workload scaling or lifecycle handling
- work across multiple subscriptions and Azure regions
- run safely under a clear managed-identity model
- execute asynchronously through the scheduler pipeline
- write execution results back so the Admin Portal can show operational status and history

## In Scope

- Define the supported service/action types for stage orchestration
- Define the minimum service-specific configuration required to execute each action type
- Define how Service Bus dispatch should be modeled for queue/topic use cases
- Define execution flow for immediate and scheduled actions
- Define execution result/status recording
- Define managed-identity direction for Azure access
- Define how completion information is surfaced back to the portal

## Out of Scope

- Full AKS lifecycle orchestration in the first release
- Replacing KEDA or downstream workload logic
- Real-time push updates to the portal in the first release
- A general-purpose workflow engine
- Cross-cloud orchestration

## Primary Users

- Admin
- EnvironmentManager
- Platform operators responsible for Azure runtime access and execution reliability

## Example Scenarios

1. A scheduled `start` action for a stage starts a SQL VM and resumes a Synapse SQL pool in different subscriptions, then records a successful execution result.
2. A scheduled `stop` action dispatches a Service Bus message to a queue or topic so downstream KEDA-driven workloads can scale down.
3. An immediate `stop` request partially fails because one Azure resource cannot be stopped; the execution result records both the successful and failed action results so the portal can show partial failure clearly.

## Business Value

- Makes stage scheduling operationally meaningful by connecting schedules to real execution
- Reduces manual Azure start/stop work
- Improves reliability through asynchronous execution and durable status recording
- Clarifies the contract between the Admin Portal, orchestration backend, and downstream consumers
