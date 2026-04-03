# FEAT-ENVIRONMENTS-002 — Filter AI chat schedule answers by environment

Status: Draft

Owner: @nicol

Date: 2026-04-03

Summary
-------
Allow AI-chat responses that include schedule, client, environment and execution context to be filtered by environment. This enables users to ask the AI about schedules scoped to a specific environment (for example staging or production) and receive answers that only include data from that environment.

Background and motivation
-------------------------
The existing AI chat feature builds contextual result data (schedules, client, environment, recent executions) and passes this to the LLM. When users manage multiple environments, AI answers may surface unrelated schedules or executions. Adding an environment filter reduces noise and makes answers environment-specific and actionable.

Goals
-----
- Add an optional environment filter to the AI chat API.
- Ensure server-side logic only includes schedules/executions for the requested environment.
- Keep the change backward compatible when no filter is specified.

Scope
-----
In-scope:
- API contract change to accept `filters.environmentId` and `filters.environmentName`.
- Backend change in `function_ai_chat` to apply environment filtering when building result data.
- Unit tests for `_build_result_data` behavior and API-level integration test for the chat endpoint.

Out-of-scope:
- Frontend UI changes beyond adding a filter parameter in the chat request payload (frontend work tracked separately if requested).
- Changes to LLM prompt templates beyond ensuring `result_data` reflects the requested environment.

User stories
------------
- As a user, I can ask the AI chat to "Show schedule status for production" and receive answers only referencing schedules in the `production` environment.
- As an admin, I can include `environmentId` in the chat filters to force answers to a particular environment.

Acceptance criteria
-------------------
1. The API accepts `filters.environmentId` (string, optional) and `filters.environmentName` (string, optional). Both are optional and may be supplied together; `environmentId` takes precedence.
2. When `environmentId` or `environmentName` is provided, `_build_result_data` only returns schedule summaries and recent executions that belong to the matching environment.
3. If a `scheduleId` is provided together with an environment filter and the schedule exists but is in a different environment, the system returns a clear note in `result_data` and the response must not include executions from other environments.
4. Existing behaviour is unchanged when no environment filter is provided.
5. Unit tests cover: environment filtering by id; filtering by name; schedule+environment mismatch handling; no-filter legacy behaviour.

Data model / API delta
----------------------
Add to chat request `filters` object:
- `environmentId` (string, optional) — internal identifier for an environment.
- `environmentName` (string, optional) — human-friendly environment name (e.g., "production").

Security and authorization
--------------------------
No additional authorization changes are required. The AI chat endpoint follows existing auth checks — if the user is not authorized, they will not reach the filtering logic.

Implementation notes
--------------------
- Backend: update `backend/function_ai_chat/__init__.py` in `_build_result_data` to:
  - accept `filters.get("environmentId")` and `filters.get("environmentName")`.
  - when present, restrict schedule lookup and execution listing to schedules whose `environment_id` or `environment` matches the provided value.
  - if `scheduleId` is also provided and the schedule's environment doesn't match the filter, include an explicit summary line that indicates the mismatch and avoid including unrelated executions.
- Tests: add unit tests exercising `_build_result_data` with mocked schedules, clients and execution stores.

Traceability
------------
Implementation will reference this feature spec and the API spec `api-spec.md` in the same folder.

Next steps
----------
1. Add `api-spec.md` describing the API contract change.
2. Implement backend change and tests.
3. Update frontend or integration tests if the UI or consumers need to pass environment filters.
