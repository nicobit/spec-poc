# Task Breakdown — AI Chat

1. Specification
   - Create/approve `feature-spec.md`, `api-spec.md`, `test-plan.md`. (done)
   - Update `feature-spec.md` for two-tier context + tool-calling architecture. (done)

2. Backend — Tier 1 catalog
   - Replace `_build_result_data` (ID-filtered) with `_build_catalog` that always injects all clients, environments, schedules (key fields). (done)

3. Backend — Tier 2 aggregation tools
   - Add `get_failure_summary(since_days)` and `list_failed_executions(since_days, schedule_id, limit)` to `execution_store.py` (in-memory + `CosmosStageExecutionStore`). (done)

4. Backend — Tool-calling loop
   - Add `OpenAIService.chat_with_tools()` supporting OpenAI `tools` / `tool_choice` API. (done)
   - Replace single LLM call in `function_ai_chat/__init__.py` with a loop (max 2 rounds). (done)
   - Implement `_execute_tool` dispatcher routing tool calls to the live store. (done)

5. Tests
   - Update existing unit tests to cover catalog builder, tool dispatcher, and loop behavior.
   - Add tests for new aggregation methods (in-memory and Cosmos store).

6. Frontend
   - Assistant panel and `QueryContext` routing unchanged; filters are now optional. (no change needed)

7. Validation & Release
   - Run full CI, fix failing tests.
   - Open PR with changelist and link to feature spec.
   - Manual acceptance testing: freeform questions without IDs.

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
