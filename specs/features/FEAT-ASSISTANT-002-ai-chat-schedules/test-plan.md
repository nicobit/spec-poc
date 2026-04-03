# Test Plan — AI Chat

Automated tests (added)
- `tests/backend/test_ai_chat.py` — handler authentication and structured response.
- `tests/backend/test_redaction.py` — redaction patterns and truncation.
- `tests/backend/test_redaction_env.py` — env-var allowlist and max length.
- `tests/backend/test_ai_handler_allowlist.py` — integration-style handler test (mocks PromptManager/OpenAI).
- `frontend/src/features/chat/contexts/QueryContext.integration.test.tsx` — frontend integration for `ai:` queries.

- **Regression**: Update `AssistantPanel` test to accept `ai:` prefixed prompts.

Acceptance tests (manual)
- Validate end-to-end: open assistant panel, ask about a failing schedule, confirm answer includes remediation and execution reference.
- Confirm PII redaction: send message with email/GUID and inspect prompt logged (or mock) to ensure redaction.

CI
- Ensure backend tests run in Python job and frontend tests run in Node job. Fail pipeline on test failures.
# Test Plan: AI Chat for Schedules

Unit Tests
----------
- Backend: context builder — given sample schedule/failure payloads, produce the sanitized summary.
- Prompt builder — construct the system/user prompt shapes.

Integration Tests
-----------------
- Mock backend data endpoints and mock Azure OpenAI responses to validate full backend flow: `/api/ai/chat` returns expected structured answer and remediation.

End-to-end Tests
----------------
- Run a smoke test from frontend: submit common queries and assert non-empty `answer` and `references` present.

Security Tests
--------------
- RBAC: verify only authorized users can access schedule data via the chat endpoint.
- PII redaction tests: verify sensitive fields are not included in the model context.

Performance
-----------
- Load-test `POST /api/ai/chat` with concurrent users to validate throttling and model latency behavior.
