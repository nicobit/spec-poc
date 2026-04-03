# Validation Report — AI Chat for Schedules and Failures

## Feature ID

`FEAT-ASSISTANT-002`

## Status

`In Progress` — Core implementation delivered; one structural gap closed (function.json); context builder partially complete; end-to-end acceptance testing pending.

## Artifacts Updated

- `specs/features/FEAT-ASSISTANT-002-ai-chat-schedules/business-request.md`
- `specs/features/FEAT-ASSISTANT-002-ai-chat-schedules/spec-refinement.md` *(added 2026-04-02)*
- `specs/features/FEAT-ASSISTANT-002-ai-chat-schedules/feature-spec.md`
- `specs/features/FEAT-ASSISTANT-002-ai-chat-schedules/api-spec.md`
- `specs/features/FEAT-ASSISTANT-002-ai-chat-schedules/test-plan.md`
- `specs/features/FEAT-ASSISTANT-002-ai-chat-schedules/task-breakdown.md`
- `backend/function_ai_chat/__init__.py`
- `backend/function_ai_chat/redaction.py`
- `backend/function_ai_chat/function.json` *(added 2026-04-02 — fixes 404)*
- `backend/app/services/llm/schemas.py`
- `frontend/src/features/chat/contexts/QueryContext.tsx`
- `frontend/src/features/chat/api/ai.ts`
- `frontend/src/app/components/AssistantPanel.tsx`

## Validation Performed

- `python -m pytest tests/backend -q` → **98 passed, 27 warnings** (2026-04-02)
- Backend handler responds correctly for authenticated users with mocked OpenAI (verified in `test_ai_chat.py`)
- Redaction patterns verified in `test_redaction.py` and `test_redaction_env.py`
- Allowlist integration verified in `test_ai_handler_allowlist.py`
- Frontend `ai:` query routing wired through `QueryContext` (integration test present)

## Completed Items

- Business request documented
- Spec refinement documented
- Feature spec and API spec present
- Backend `POST /api/ai/chat` handler implemented with auth, context builder, PII redaction, and schema-validated LLM output
- `function.json` registered — endpoint now available at `/api/ai/chat` under Azure Functions host
- Redaction helper covers emails, GUIDs, IPv4, phone numbers, SSNs, and long digit groups
- `AiAnswerModel` Pydantic schema enforced; raw text fallback on validation failure
- Frontend assistant panel renders answers and references
- Unit tests pass in CI

## Pending Items

| Item | Owner | Notes |
|---|---|---|
| Context builder — execution store path | `@backend-owner` | `list_stage_executions_for_schedule` fallback in-progress |
| `AssistantPanel` test update to expect `ai:` prefix | `@frontend-owner` | Noted in task-breakdown |
| End-to-end acceptance test with live backend | `@qa` | Blocked until Azure OpenAI creds available in dev |
| PII redaction — migrate `_redact_pii` to use shared `Redactor` class | `@backend-owner` | Duplicate logic in `__init__.py` vs `redaction.py` |
| Pydantic v2 — replace `parse_obj` with `model_validate` | `@backend-owner` | Deprecation warnings appear in test run |

## Residual Risks

- LLM hallucination: JSON schema enforcement and raw-text fallback are in place; manual review of sample answers recommended before production release.
- Cost: no per-user rate limiting in first release; monitor Azure OpenAI usage after enablement.
- Context builder completeness: if execution store is unavailable, the assistant answers without failure history context — gracefully degraded, not broken.
