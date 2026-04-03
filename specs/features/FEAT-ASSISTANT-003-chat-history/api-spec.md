Title: AI Chat — conversation history (session management)

Overview
--------
Extend the AI chat request/response contract to carry an opaque `session_id` so the server can load, update, and persist multi-turn conversation history across requests. History is token-budget-windowed and old turns are condensed via rolling LLM summarization.

Endpoint
--------
POST /api/ai/chat

(Maps to `ai_chat` in `backend/function_ai_chat/__init__.py`.)

Request
-------
JSON body (all existing fields preserved; `session_id` is new):

```json
{
  "message": "string",
  "filters": {
    "scheduleId": "string (optional)",
    "clientId": "string (optional)",
    "environmentId": "string (optional)",
    "environmentName": "string (optional)"
  },
  "includeRemediation": true,
  "session_id": "string (optional, UUID)"
}
```

- `session_id` — opaque UUID returned by a prior call. Omit (or send `null`) to start a new session.
- When `session_id` refers to an expired or non-existent session the backend silently creates a new session.

Response
--------
```json
{
  "answer": "string",
  "remediation": ["string"],
  "references": [{ "type": "string", "id": "string", "snippet": "string" }],
  "session_id": "string (UUID)",
  "history": [
    { "role": "user | assistant", "content": "string" }
  ]
}
```

- `session_id` — always present; clients must store this and send it on the next turn.
- `history` — full ordered turn list for the session (user + assistant, newest last). The frontend should use this to render the conversation rather than reconstructing from local state.

Session and history behaviour
------------------------------
- A new session is created automatically when `session_id` is absent or unresolvable.
- On each request the server injects prior turns into the LLM prompt in chronological order, walking backward from most recent until `CHAT_HISTORY_TOKEN_BUDGET` estimated tokens are consumed. A warning is logged when the budget is exhausted.
- If a rolling summary exists for the session it is prepended as a `system` message before the recent turns.
- When the number of un-summarized turns reaches `CHAT_SUMMARIZE_THRESHOLD` the server makes one additional LLM call to produce a summary. This is non-blocking: a summarization failure is logged and silently skipped.
- Sessions expire via Cosmos TTL (`CHAT_SESSION_TTL_DAYS` days). An expired session is treated as non-existent.
- When `COSMOS_CONNECTION_STRING` is absent the server falls back to an in-memory store; sessions are lost on restart.

Authorization
-------------
- Authentication required: Yes — Bearer token (same as all other `/api/ai/*` routes).
- The backend uses the `oid` / `sub` / `preferred_username` JWT claim as `userId` to scope sessions. A user cannot load another user's session.

Status codes
------------
- `200` — success; response body as above
- `400` — malformed request body
- `401` — missing or invalid token
- `503` — OpenAI service unavailable

Compatibility
-------------
This is a backward-compatible, additive change:
- Clients that do not send `session_id` continue to work; they receive a new `session_id` they may ignore.
- `history` is a new field; older clients that do not read it are unaffected.

Environment variables
---------------------
| Variable | Default | Description |
|----------|---------|-------------|
| `COSMOS_CONNECTION_STRING` | *(unset)* | Enable Cosmos DB persistence; omit for in-memory |
| `COSMOS_CHAT_CONTAINER_NAME` | `chatsessions` | Cosmos container name |
| `CHAT_HISTORY_TOKEN_BUDGET` | `3000` | Max estimated tokens of prior turns per request |
| `CHAT_SUMMARIZE_THRESHOLD` | `6` | Unsummarized turns before rolling summary is triggered |
| `CHAT_SESSION_TTL_DAYS` | `7` | Session document time-to-live in days |

Testing notes
-------------
- Unit tests for session helpers: `tests/backend/test_chat_session_store.py` (20 tests)
- Integration tests for endpoint session_id round-trip: `tests/backend/test_ai_chat.py`
- Frontend session persistence: `frontend/src/features/chat/contexts/QueryContext.integration.test.tsx`
