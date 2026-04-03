# Feature: AI Chat for Schedules and Failures

Summary
-------
Provide an in-app AI chat assistant that answers natural-language questions about clients, environments, schedules, and execution failures. The assistant returns concise interpretations, remediation steps, and references to executions or schedules.

Scope
-----
- Backend: `POST /api/ai/chat` implemented in `backend/function_ai_chat`.
- Frontend: Assistant panel integrated with AI mode and `QueryContext` routing for `ai:` queries.
- Safety: PII redaction, JSON schema validation of LLM outputs, unit tests.

Acceptance Criteria
-------------------
1. `POST /api/ai/chat` returns JSON: `{answer: str, remediation: [str], references: [...]}` and status 200 for authenticated users.
2. The assistant uses only retrieved context (schedules, clients, env, executions) and redacts PII before prompting the LLM.
3. Frontend `ai:` queries produce an entry in the assistant panel with the model answer and references.
4. Unit tests cover handler, redaction, and integration flow; CI runs them.

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
- The UI sends the user message and optional filters (client id, schedule id, timeframe) to backend `POST /api/ai/chat`.
- Backend fetches the minimal set of records required from schedule/client/environment/failure endpoints, sanitizes/redacts PII, and constructs a context summary.
- Backend calls Azure OpenAI with a system prompt that enforces brevity, factuality, and includes the sanitized context.
- The assistant returns: a concise diagnosis, supporting evidence (timestamps, error codes), and prioritized remediation steps.

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
