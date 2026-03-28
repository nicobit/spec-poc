# Business Approval Summary

## Summary

This feature extends environments management from simple start/stop scheduling to a broader Azure stage orchestration capability.

## Approved Direction

- Environment stages can be configured with Azure service targets used for lifecycle actions
- Supported initial stage action types include SQL VM, SQL Managed Instance, Synapse SQL pool, and Service Bus message dispatch
- Administrators and environment managers can manage stage configuration and schedules
- Recipient groups can be defined per environment/stage for notifications
- Authorized recipients can postpone scheduled actions
- Activity history must include configuration changes, lifecycle actions, notifications, and postponements

## Business Constraints

- Operational safety is more important than minimizing clicks
- Auditability is required for both execution and postponement
- The feature must remain manageable by administrators without direct code or infrastructure changes for each environment

## Follow-up Decisions Required

- Final notification channel set
- Final postponement rules and limits
- Final identity model for recipient groups
