# Spec Refinement

## Refined Problem

The existing environments capability is too narrow for real operational use. Environment stages often depend on multiple Azure resource types and require preconfigured service details, coordinated scheduling, and communication with affected users before automated actions run.

## Clarified Scope

- Environment stages may include one or more Azure resource action definitions
- Supported initial action types:
  - SQL VM start/stop
  - SQL Managed Instance start/stop or equivalent supported lifecycle action
  - Synapse SQL pool start/resume and stop/pause
  - Service Bus message dispatch as part of a lifecycle workflow
- Administrators can define and maintain the Azure service metadata needed to execute those actions
- Schedules are tied to environment stages and can notify configured recipient groups
- Authorized notified users can postpone scheduled actions
- Activity history must show lifecycle actions, notifications, postponements, and execution outcomes

## Assumptions

- Existing RBAC roles `admin` and `environment-manager` remain the primary management roles
- Notification recipients may not be administrators, but must still be validated as authorized postponement actors for the related environment
- A stage is the operational unit for orchestration, even if the UI still presents environment-level grouping

## Open Questions

- Which notification channels are required in the first implementation: email only, Teams, or generic provider abstraction?
- What is the exact postponement policy model: single postponement, multiple postponements, max duration, cutoff before forced execution?
- For SQL Managed Instance, do we model abstract start/stop semantics only, or exact Azure API operations that may differ by service limitations?
- Should recipient groups be managed by free-form identifiers, Entra groups, app-managed groups, or both?

## Derived Requirements

- Support stage-level orchestration configuration
- Support stage lifecycle actions across multiple Azure service types
- Support notification recipient groups per environment/stage
- Support schedule postponement with audit trail
- Ensure unauthorized users cannot configure or postpone actions

## Recommended Design Direction

- Keep environment/stage configuration as app-managed metadata
- Expose a clear API contract for:
  - stage configuration
  - immediate control actions
  - schedule management
  - postponement
  - activity retrieval
- Treat notifications and postponements as first-class activity events, not side effects hidden in logs
