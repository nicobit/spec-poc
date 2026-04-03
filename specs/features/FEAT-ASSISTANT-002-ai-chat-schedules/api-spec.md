# API Spec — AI Chat

Endpoint
--------
POST /api/ai/chat

Request
-------
- Headers: Authorization: Bearer <token>
- Body (JSON):

```json
{
  "message": "Why did schedule X fail?",
  "filters": { "scheduleId": "sched-1" },
  "includeRemediation": true
}
```

Response
--------
- 200 OK

```json
{
  "answer": "...",
  "remediation": ["..."],
  "references": [{"type":"execution","id":"exec-1","snippet":"..."}]
}
```

Errors
------
- 401 Unauthorized — when user not authenticated
- 503 Service Unavailable — when LLM call fails

Server-side Notes
-----------------
- The handler builds `result_data` from stores: schedules, clients, environment, recent executions.
- `result_data` is redacted via `function_ai_chat.redaction.redact_text`.
- LLM output is validated with `AiAnswerModel` (Pydantic) and falls back to raw text when invalid.
# API Spec: AI Chat Endpoint

Endpoint
--------
POST /api/ai/chat

Request
-------
- Headers: `Authorization: Bearer <token>`
- Body (application/json):

  {
    "message": "string",            // user natural-language query
    "filters": {                      // optional filters to limit data scope
      "clientId": "string",
      "scheduleId": "string",
      "environment": "string",
      "from": "ISO8601",
      "to": "ISO8601"
    },
    "includeRemediation": true        // whether to include remediation steps
  }

Response
--------
- 200 OK

  {
    "answer": "string",            // assistant text (markdown allowed)
    "references": [                  // list of data references used
      { "type": "schedule", "id": "1234", "snippet": "error: timeout" }
    ],
    "remediation": ["step 1", "step 2"]
  }

Errors
------
- 400 Bad Request — invalid filters
- 401 Unauthorized — user not authenticated/authorized
- 503 Service Unavailable — model or upstream data unavailable

Notes
-----
- Backend must fetch only minimal data required and sanitize before sending to the model.
- All usage of the Azure OpenAI API must be proxied through the backend service.
