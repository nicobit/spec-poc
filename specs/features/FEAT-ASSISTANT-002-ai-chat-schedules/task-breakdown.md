# Task Breakdown — AI Chat

1. Specification
   - Create/approve `feature-spec.md`, `api-spec.md`, `test-plan.md`. (done)

2. Backend
   - Implement `POST /api/ai/chat` handler and register ASGI subapp. (done)
   - Implement context builder reading schedules, clients, environment, executions. (in-progress)
   - Implement/redact `redaction.py` and Pydantic `AiAnswerModel`. (done)
   - Add unit and integration tests (done).

3. Frontend
   - Wire `submitAiChat` client and `QueryContext` routing (done).
   - Assistant panel UI adjustments and mode toggle. (done)
   - Add integration tests for `QueryContext` (done).

4. Validation & Release
   - Run full CI, fix failing tests (one existing `AssistantPanel` test needs update to expect `ai:` prefix).
   - Open PR with changelist and link to feature spec.
   - Manual acceptance testing and stakeholder review.

Owners
- Backend: `@backend-owner` (replace as appropriate)
- Frontend: `@frontend-owner`
# Task Breakdown: AI Chat for Schedules

1. Create feature package and approval artifacts — 1d
2. Design API and context retrieval flows — 1d
3. Implement backend context builder service (sanitization + summarization) — 2d
4. Add Azure OpenAI integration (service wrapper, retries, timeouts) — 1.5d
5. Implement `POST /api/ai/chat` endpoint and RBAC checks — 1d
6. Implement frontend chat UI and integration (chat box, filters, results) — 2d
7. Tests: unit, integration, E2E & security tests — 2d
8. Documentation & traceability updates — 0.5d
9. Validation, performance testing and PR — 1d

Total: ~10 days (adjustable)
