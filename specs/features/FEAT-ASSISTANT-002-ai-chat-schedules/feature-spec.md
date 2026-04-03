# Feature: AI Chat for Schedules and Failures

Summary
-------
Provide an in-app AI chat assistant that answers natural-language questions about clients, environments, schedules, and execution failures. The assistant returns concise interpretations, remediation steps, and references to executions or schedules.

The assistant operates without requiring the caller to provide entity IDs. A compact catalog of all clients, environments, and schedules is always injected into context (Tier 1). For execution-level detail the LLM dynamically invokes server-side tool functions via OpenAI function-calling (Tier 2).

Scope
-----
- Backend: `POST /api/ai/chat` implemented in `backend/function_ai_chat`.
- Backend: Tier 1 catalog builder — compact lists of clients, environments, schedules, always injected.
- Backend: Tier 2 aggregation tools — `get_recent_executions`, `get_failure_summary`, `list_failed_executions` callable by the LLM.
- Backend: Tool-calling loop in `OpenAIService` and handler (max 2 rounds to control cost).
- Frontend: Assistant panel integrated with AI mode and `QueryContext` routing for `ai:` queries.
- Safety: PII redaction, JSON schema validation of LLM outputs, unit tests.

Acceptance Criteria
-------------------
1. `POST /api/ai/chat` returns JSON: `{answer: str, remediation: [str], references: [...]}` and status 200 for authenticated users.
2. The assistant answers freeform questions without requiring `scheduleId`, `clientId`, or `environmentId` filters.
3. The assistant injects compact Tier 1 catalog on every request (all clients/environments/schedules, key fields only).
4. When execution-level data is needed, the LLM emits a tool call; the backend executes it and feeds results back before the final answer.
5. The assistant uses only retrieved context and redacts PII before prompting the LLM.
6. Frontend `ai:` queries produce an entry in the assistant panel with the model answer and references.
7. Unit tests cover handler, redaction, tool dispatch, and integration flow; CI runs them.

Implementation Links
--------------------
- Backend handler: [backend/function_ai_chat/__init__.py](backend/function_ai_chat/__init__.py#L1)
- Redaction helper: [backend/function_ai_chat/redaction.py](backend/function_ai_chat/redaction.py#L1)
- LLM schemas: [backend/app/services/llm/schemas.py](backend/app/services/llm/schemas.py#L1)
- Frontend integration: [frontend/src/features/chat/contexts/QueryContext.tsx](frontend/src/features/chat/contexts/QueryContext.tsx#L1)
- Frontend API: [frontend/src/features/chat/api/ai.ts](frontend/src/features/chat/api/ai.ts#L1)

Risks & Mitigations
--------------------
- PII leakage: redaction applied; allowlist via `AI_REDACTION_ALLOWLIST` env var.
- LLM hallucination: enforce JSON schema and return raw text fallback when validation fails.
- Cost/latency: prompt truncation and max_tokens controls; monitor in telemetry.

User Stories
------------
- As a Support Engineer, I want to ask "Why did schedule 1234 fail?" so I can quickly diagnose and triage the issue.
- As an SRE, I want to ask "Show me failed schedules for client ACME in the last 24h" so I can prioritize incidents.
- As a Product Manager, I want the assistant to cite the data used in its answer for traceability.

Behavior
--------
- The UI sends the user message and optional filters (client id, schedule id, timeframe) to `POST /api/ai/chat`. Filters are optional and no longer required.
- Backend builds a compact Tier 1 catalog (all clients, environments, schedules — key fields only) and injects it into every prompt.
- Backend calls Azure OpenAI with `tools` defined (`get_recent_executions`, `get_failure_summary`, `list_failed_executions`).
- If the model returns a tool call, the backend executes the corresponding function against the live store (Cosmos when available, in-memory otherwise), appends the result, and calls the model again.
- The loop runs at most 2 tool-call rounds to bound cost, then produces the final answer.
- All context (catalog + tool results) is redacted via `redaction.py` before being sent to the model.
- The assistant returns: a concise diagnosis, supporting evidence (timestamps, error codes), and prioritized remediation steps.

Tool Definitions
----------------
- `get_recent_executions(schedule_id, limit=10)` — recent stage executions for a schedule.
- `get_failure_summary(since_days=7)` — aggregated failure counts per schedule over N days.
- `list_failed_executions(since_days=7, schedule_id=None, limit=20)` — filtered list of failed executions.

Privacy & Security
------------------
- No direct client-side calls to Azure OpenAI. All model calls happen server-side using configured secrets.
- Responses must not include raw secrets or sensitive identifiers unless user has permission — the backend enforces RBAC.

Observability
-------------
- Log metadata for queries (user id, sanitized filters, response time) but never store full user messages or PII in logs.

Model & Cost Controls
---------------------
- Use Azure OpenAI with a cost-conscious model and temperature settings tuned for factual answers.
- Rate-limiting per user is deferred to a future iteration.

Failure Handling
----------------
- If backend data retrieval fails, return a graceful error that suggests retry steps.
- If model call times out or fails, fallback to a short, deterministic message and appropriate HTTP status.
