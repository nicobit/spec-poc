Title: AI Chat — environment filter

Overview
--------
Extend the AI chat request contract to support environment-scoped filters so the server can limit the contextual data provided to the LLM to a single environment.

Endpoint
--------
POST /api/ai/chat

(Note: this maps to the `ai_chat` function in `backend/function_ai_chat`.)

Request
-------
JSON body (existing fields preserved):

{
  "message": "string",
  "filters": {
    "scheduleId": "string (optional)",
    "clientId": "string (optional)",
    "environmentId": "string (optional)",
    "environmentName": "string (optional)"
  }
}

Behavior
--------
- `environmentId` and `environmentName` are optional. If both are provided, `environmentId` takes precedence.
- When an environment filter is present, the server will:
  - Prefer schedules that belong to the specified environment when assembling `result_data`.
  - Restrict recent execution listings to executions whose schedule belongs to that environment.
  - If a `scheduleId` is provided that exists but is in a different environment than the filter, the server should include a small explanatory note in `result_data` (e.g., "Requested schedule X exists in environment Y which does not match requested environment Z. Showing only data for the requested environment.") and avoid including executions from other environments.
- When no environment filter is provided, behavior is unchanged.

Response
--------
- 200: JSON object with `answer` (string) — the LLM text answer. The server includes the same authorization and rate-limiting behavior as today.
- 400: invalid request body
- 401: unauthorized
- 500: server error

Examples
--------
1) Filter by environment id

Request body:

{
  "message": "What's the status of schedules?",
  "filters": { "environmentId": "env-prod-123" }
}

2) Filter by environment name

Request body:

{
  "message": "Show recent failures",
  "filters": { "environmentName": "staging" }
}

Compatibility
-------------
- This change is additive and backward-compatible: existing clients that do not supply `environmentId`/`environmentName` will continue to receive the same contextual data.

Testing notes
-------------
- Add unit tests for `_build_result_data` to assert environment-scoped results.
- Add an integration test for `POST /api/ai/chat` to confirm `filters.environmentId` restricts included schedules and executions.

***
