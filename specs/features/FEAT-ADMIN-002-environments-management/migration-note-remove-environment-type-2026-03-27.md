# Migration Note: Remove `Environment.type`

Date: 2026-03-27

## Summary

- The `Environment.type` field has been removed from the backend API contract and canonical model.

## Why

- The resource type is modeled per stage via `stage.resourceActions[].type`.
- `Environment.type` was redundant and could get out of sync with the per-stage model.

## What Changed

- Backend: `Environment.type` removed from canonical model and create/update endpoints.
- Frontend: create and edit flows no longer send `type`; environment listings and displays no longer show it.
- Tests and fixtures: updated to stop providing `type`.

## Migration And Compatibility

- Consumers must stop sending `type` in `POST /api/environments` and `PUT /api/environments/{id}`.
- If the UI needs a logical environment type, derive it from per-stage `resourceActions` rather than a top-level environment field.

## Notes

- This note is feature-scoped and belongs to the Environments Management package because it documents a contract and behavior change within this feature area.
