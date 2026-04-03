# Spec Refinement — AI Chat for Schedules and Failures

## Feature ID

`FEAT-ASSISTANT-002`

## Original Request Summary

Add an in-app AI assistant that answers natural-language questions about clients, environments, schedules, and execution failures. Responses must include data references, remediation steps, and must not expose PII.

## Clarifications and Assumptions

| Topic | Assumption / Decision |
|---|---|
| Model access | Azure OpenAI; credentials managed via backend secrets, no client-side key exposure |
| Data sources | In-memory stores for schedules, clients, environments, and execution records; no new dedicated backend read endpoints needed for first release |
| RBAC | Backend enforces authentication on every request; only authenticated users can query |
| PII scope | Emails, GUIDs, IPs, phone numbers, SSNs, and long digit groups redacted before prompting; allowlist configurable via `AI_REDACTION_ALLOWLIST` |
| Remediation output | LLM output validated against `AiAnswerModel` Pydantic schema; raw text fallback when schema validation fails |
| Frontend entry point | Queries prefixed with `ai:` are routed through `QueryContext` to the assistant panel — no separate chat page needed |
| Caching | No response caching in first release |
| Conversation history | Stateless per request; no server-side session storage |

## Refined Acceptance Criteria

1. `POST /api/ai/chat` returns `{answer, remediation, references}` with HTTP 200 for authenticated users.
2. Unauthenticated calls return HTTP 401.
3. LLM is never called with raw PII; redaction runs before prompt construction.
4. Frontend `ai:` queries produce a visible answer and reference list in the assistant panel.
5. Unit tests cover handler auth, context builder, and redaction patterns; all pass in CI.
6. Azure Functions host exposes the endpoint (`function.json` registered).

## Open Questions at Refinement

- Should conversation history be persisted across browser sessions? (deferred to future iteration)
- What is the approved throttle limit per user per minute? (deferred; rate limiting not in scope for first release)

## Scope Boundary

In scope: Q&A on existing schedule/client/environment/execution data, PII redaction, schema-validated JSON responses, frontend wiring.

Out of scope: automated remediation actions, conversation memory, direct Azure OpenAI calls from the frontend.
