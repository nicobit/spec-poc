# Business Request

## Request Summary

- Title: Add a user directory page for administrators
- Requested by: Business operations stakeholder
- Date: 2026-03-22

## Business Problem

- Administrators do not have a simple place in the portal to review users and basic account status.
- This slows support and creates unnecessary requests to engineering or identity administrators.

## Users And Impact

- Internal administrators are affected.
- They need to quickly find users and understand whether an account is active.

## Desired Outcome

- Administrators can open a user directory page, search users, and inspect a small set of key attributes.
- Success means common lookup tasks can be completed without engineering support.

## Example Scenarios

- An administrator searches by display name and sees matching users.
- An administrator opens the page and immediately sees whether a user is active or disabled.

## Priority And Timing

- Priority: High
- Desired timeline: Next iteration

## Constraints

- Policy or compliance constraints: Do not expose sensitive identity data beyond agreed fields.
- Business rules: The first version is read-only.
- Known technical constraints: Current frontend exists in `frontend/`; backend begins in Azure Functions.

## Out Of Scope

- User editing
- Role assignment
- Bulk import or export

## Additional Context

- This is intended as an initial administrator productivity feature.
