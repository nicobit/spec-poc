# PR Draft: FEAT-ENVIRONMENTS-002 — Filter AI chat schedule answers by environment

## Summary
Add optional environment filtering to the AI chat endpoint so LLM answers include only schedules and executions for the requested environment.

## Changes
- Backend: `backend/function_ai_chat/__init__.py`
  - Resolve `filters.environmentId` / `filters.environmentName`.
  - If an environment filter is provided, restrict included schedules and executions to that environment.
  - If `scheduleId` is provided but in a different environment, include explanatory note and avoid showing unrelated executions.
- Frontend: `frontend/src/features/chat/contexts/QueryContext.tsx`
  - When invoking AI chat via `ai:` prefix, include `environmentId` or `environmentName` from the URL search params in `filters`.
- Specs: `specs/features/FEAT-ENVIRONMENTS-002-filter-ai-chat-schedule/*` added
- Tests: Unit and integration tests under `tests/backend/` added/updated

## Acceptance checklist
- [x] Feature spec and API spec added: `specs/features/FEAT-ENVIRONMENTS-002`.
- [x] Backend implementation updated and unit tests added.
- [x] Integration test for `/api/ai/chat` added and passing.
- [x] Frontend includes environment filter when present in URL.
- [x] All backend tests pass: `python -m pytest tests/backend` (102 passed locally).

## Testing notes
- Backend tests were run locally with `PYTHONPATH=backend` and passed.
- Integration test mocks `OpenAIService.chat` to avoid external calls.

## Notes for reviewers
- The change is additive and backward-compatible: clients not sending `filters.environmentId`/`environmentName` are unaffected.
- Frontend change reads environment from URL search params; if we prefer centralized environment state, we can update `QueryContext` to read from a shared environment context instead.

## Related
- Specs: `specs/features/FEAT-ENVIRONMENTS-002-filter-ai-chat-schedule/feature-spec.md`
- API spec: `specs/features/FEAT-ENVIRONMENTS-002-filter-ai-chat-schedule/api-spec.md`

