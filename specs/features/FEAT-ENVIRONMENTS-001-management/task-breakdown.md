# Task Breakdown

## BA-1 Business Analysis

- Confirm whether this enhancement remains within `FEAT-ENVIRONMENTS-001`

- Absorbed enhancement cleanup:
  - merge failed-execution detail highlighting into the environment details acceptance criteria and validation history
- Refine the problem statement, scope, and non-scope
- Confirm open questions around notifications, postponement policy, and recipient identity model

## ARCH-1 Solution Design

- Define the stage orchestration model for supported Azure service action types
- Finalize API contract for stage configuration, schedule management, notification metadata, and postponement
- Clarify SQL Managed Instance lifecycle semantics and scheduling implications
- Standardize canonical schedule linkage on existing `Environment.id` and `Stage.id` values and define legacy label-resolution behavior

## UX-1 Experience Design

- Design environment/stage management flow for configuration, scheduling, recipients, and postponement
- Ensure activity history and action eligibility are clearly represented
- Align the UI with repository UI standards and theme system
- Finalize user-facing navigation and terminology for:
  - `Manage environments`
  - `Environment details`
  - `Edit environment`
  - `Environment schedules`
- Confirm whether the current `Resources` page is removed, renamed, or absorbed into edit/details flows
- Ensure the experience communicates the hierarchy of `Client > Environment > Stage > Schedule`

## TEST-1 Test Planning

- Update unit, API, integration, and UI coverage for orchestration configuration and postponement
- Map acceptance criteria to validation steps

## FE-1 Frontend Implementation

- Update navigation to remove the dedicated `Resources` entry from the intended primary user flow
- Ensure `Manage` and `Schedules` remain the primary navigation items under `Environments`
- Update page labels and supporting copy to use:
  - `Manage environments`
  - `Environment details`
  - `Edit environment`
  - `Environment schedules`
- Consolidate Azure service setup into the environment create/edit flow only
- Remove or de-emphasize any duplicate user-facing entry point for Azure service setup outside create/edit
- Strengthen client-first presentation on the manage page
- Surface schedule summaries, notification summaries, and postponement context from details with clear links to schedule management
- Add schedule configuration fields for recipient groups and postponement policy
- Surface activity, notification, and postponement status
- Add role-aware visibility for management and postponement actions

## FE-2 Suggested Delivery Order

- Step 1: navigation cleanup
  - remove `Resources` from the sidebar
  - keep route compatibility temporarily if needed during transition
- Step 2: wording and page-title cleanup
  - align visible labels with the approved terminology
  - remove internal terms from user-facing headings and helper text
- Step 3: manage page hierarchy refinement
  - make client ownership more visually prominent
  - decide whether to group by client or retain a flat list with stronger client cues
- Step 4: details-to-schedules handoff
  - make schedules, notifications, and postponement read-only summaries on details
  - provide clear edit/manage entry points into schedules
- Step 5: orphaned flow cleanup
  - retire or repurpose old environment resource editing screens if they no longer match the approved IA

## BE-1 Backend Implementation

- Extend environment APIs for stage configuration
- Add orchestration handling for supported Azure action types
- Extend schedule model and persistence for recipients and postponement policy
- Extend schedule model and persistence to store canonical `environment_id` and `stage_id` references while preserving temporary compatibility with legacy label-based records
- Implement postponement endpoint and activity events

## SEC-1 Security Review

- Verify role requirements and recipient-scoped postponement authorization
- Confirm access-control documentation updates

## AUTO-1 Automation Testing

- Add or update automated tests across backend and frontend
- Cover positive and negative authorization scenarios

## DOC-1 Documentation

- Update authorization documentation if required
- Update developer/operator docs if configuration workflows change
- Update validation report at feature close
