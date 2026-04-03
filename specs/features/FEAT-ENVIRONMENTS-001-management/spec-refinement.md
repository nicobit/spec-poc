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
- The manage list view should present a single page title, keep page-level actions in the header area, and use a compact row-action pattern that expands on hover or focus without cluttering the list
- The create and edit forms should separate environment details from stage configuration, reduce redundant derived-field noise, and use resource-type-specific inputs so operators understand what to enter
- The details page should emphasize environment overview, stage summaries, schedules, and recent activity without exposing raw JSON as the primary presentation
- The schedules experience should default to business-oriented authoring using action, supported day patterns, time, and timezone instead of exposing raw cron syntax as the primary input
- Schedule-to-stage linkage should use stable environment and stage identity so renamed environments or stages do not leave schedules displaying stale labels such as `stage1`

## Information Architecture Decisions

- The primary user-facing hierarchy should be:
  - `Client`
  - `Environment`
  - `Stage`
  - `Schedule`
- `Client` should be treated as the parent business context for environment management
- `Environment` remains the operational container under a client
- `Stage` is the unit where Azure service setup is defined
- `Schedule` is a stage-level concept, even when users reach it from an environment entry point

## Ownership Model Decisions

- The environment create/edit flow should own:
  - environment basics
  - stage definitions
  - Azure services linked to each stage
- The schedules experience should own:
  - recurrence
  - timezone
  - action
  - notifications
  - postponement rules
- The details page should be primarily read-oriented and should summarize:
  - environment overview
  - stage status
  - Azure service summaries
  - schedule summaries
  - recent activity
- A dedicated `Resources` page should not remain in the intended user-facing information architecture because Azure service setup is already owned by the create/edit environment flow

## Terminology Guidance

- Avoid vague or internal labels such as:
  - `Resources`
  - `Stage actions`
  - `Stage configuration`
- Prefer user-facing labels such as:
  - `Azure services`
  - `Stages`
  - `Schedules`
  - `Notifications`
  - `Postponement rules`
- The navigation and page structure should explain the model in business terms rather than implementation terms

## Assumptions

- Existing RBAC roles `admin` and `environment-manager` remain the primary management roles
- Notification recipients may not be administrators, but must still be validated as authorized postponement actors for the related environment
- A stage is the operational unit for orchestration and scheduling, even if users enter the flow from an environment or client context
- Environment deletion remains an authorized management action and should be available from the manage list when the backend route is present
- Unless explicitly needed later, notifications and postponement rules should be treated as schedule-owned behavior rather than duplicated at both stage and schedule level
- The existing `Environment.id` and `Stage.id` fields are already intended to be stable identifiers and should be reused for schedule linkage rather than introducing a second external-id layer

## Open Questions

- Which notification channels are required in the first implementation: email only, Teams, or generic provider abstraction?
- What is the exact postponement policy model: single postponement, multiple postponements, max duration, cutoff before forced execution?
- For SQL Managed Instance, do we model abstract start/stop semantics only, or exact Azure API operations that may differ by service limitations?
- Should recipient groups be managed by free-form identifiers, Entra groups, app-managed groups, or both?
- Should the manage page move to a client-grouped inventory, or should it stay as a flat environment list with much stronger client-first visual hierarchy?
- Do any external integrations depend on the current free-form `environment` and `stage` schedule fields, or can they be treated as backward-compatible legacy fields during the identity transition?

## Schedule Authoring Decision

- The schedule create/edit flow should not require a raw cron expression as the primary user input
- The default authoring model should be:
  - `Action`
  - `Frequency`
  - `Day pattern`
  - `Time`
  - `Timezone`
- The initial supported frequency/day patterns should be:
  - every day
  - weekdays
  - selected day(s) of week
- The initial builder should assume one execution time per schedule entry
- The schedule list and detail UI should render human-readable summaries such as `Start weekdays at 08:00 Europe/Zurich`
- If the underlying backend persists cron or cron-like expressions, the frontend should treat that as an implementation detail rather than a required user concept
- If existing schedules contain cron expressions that are outside the supported builder model, the UI should surface them as advanced or unsupported schedule definitions instead of silently misrepresenting them

## Derived Requirements

- Support stage-level orchestration configuration
- Support stage lifecycle actions across multiple Azure service types
- Support client-aware environment management and browsing
- Support notification recipient groups and postponement rules as part of schedule management
- Support schedule postponement with audit trail
- Ensure unauthorized users cannot configure or postpone actions
- Support a business-oriented schedule builder that can map supported user input to the underlying stored recurrence model
- Support canonical schedule references using stable `environmentId` and `stageId` values while treating environment and stage labels as derived display fields or legacy fallback only

## Recommended Design Direction

- Keep environment/stage configuration as app-managed metadata
- Expose a clear API contract for:
  - stage configuration
  - environment deletion
  - immediate control actions
  - schedule management
  - postponement
  - activity retrieval
- Treat notifications and postponements as first-class activity events, not side effects hidden in logs
- Use a professional inventory layout with explicit empty/error states and a progressive disclosure action rail for per-row actions
- Use guided create/edit forms with a compact environment details section, a clear stage workspace, and a lightweight configuration summary instead of a single dense panel
- Use a structured details view with summary cards and readable stage/resource groupings so operators can scan status quickly before taking lifecycle actions
- Remove the current `Resources` navigation entry from the intended user-facing information architecture and keep Azure service setup within create/edit
- Replace cron-first schedule authoring with a business-oriented schedule builder, and reserve cron or advanced recurrence details for backend storage or an explicit advanced mode only if required later
- Standardize schedule identity on the existing stable `Environment.id` and `Stage.id` values; do not introduce a new external/public identifier layer unless a broader API requirement emerges later
- For early-stage or seed schedules that only store environment/stage labels, prefer reset and recreation in canonical form; any temporary legacy resolution should remain lightweight and must not guess when the match is ambiguous
