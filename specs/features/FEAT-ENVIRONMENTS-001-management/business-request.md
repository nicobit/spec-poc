# Business Request

## Title

Extend environments management to orchestrate Azure stage resources, scheduling, notifications, and postponement

## Requestor

Platform and operations stakeholders

## Problem Statement

The current Environments Management capability is limited to basic environment lifecycle actions and simple scheduling. Real stage operations require coordinated control of several Azure resource types, configuration of the Azure service details used by those actions, and a controlled notification/postponement workflow so scheduled actions can be reviewed by the people affected.

## Desired Outcome

Provide an environment orchestration capability where administrators can manage environments in the context of a client, define the Azure services associated with each stage, configure start/stop actions and service-bus dispatch behavior, and manage stage-level schedules that can notify users and be postponed by authorized recipients.

The scheduling experience should use business-oriented schedule authoring rather than requiring users to understand or enter raw cron syntax.

The scheduling capability should remain consistent after environment or stage renames, so schedule linkage must use stable environment and stage identity rather than mutable display names.

## In Scope

- Manage start and stop orchestration for environment stages that may include:
  - SQL VM
  - SQL Managed Instance
  - Azure Synapse / data analytics SQL pool
  - Service Bus message dispatch
- Allow administrators to configure the Azure service connection/target details required for those stage actions
- Allow immediate stage lifecycle actions
- Allow recurring schedules for stage actions
- Allow recurring schedules to be authored in business terms such as action, day(s) of week, time, and timezone
- Allow schedule-specific notification recipient groups
- Allow postponement of scheduled actions after notification by authorized recipients
- Record activity and audit history for actions, notifications, and postponements

## Out of Scope

- Full infrastructure provisioning of the Azure resources themselves
- Arbitrary workflow automation beyond the supported stage action types
- Multi-channel notification delivery implementation details beyond what is needed for the initial contract
- Fine-grained approval workflows beyond postponement support

## Primary Users

- Platform administrators
- Environment managers / operators
- Notified recipients who may postpone scheduled actions

## Example Scenarios

1. An administrator configures the `UAT` stage for a client so that a scheduled start sequence powers on a SQL VM, resumes a Synapse SQL pool, and sends a Service Bus message to downstream systems.
2. An environment manager configures a nightly shutdown schedule for a stage and defines the support group that must be notified before the action occurs.
3. A notified user receives a scheduled shutdown notice and postpones the action within the allowed window because testing is still in progress.

## Business Value

- Reduces manual stage lifecycle work
- Improves consistency of Azure environment operations
- Makes scheduling safer through visibility, notifications, and postponement
- Provides an auditable record of who configured, triggered, postponed, or executed environment actions
