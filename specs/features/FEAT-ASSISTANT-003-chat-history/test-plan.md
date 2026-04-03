# Test Plan — FEAT-ASSISTANT-003 — AI Chat Conversation History

## Metadata

- Feature ID: FEAT-ASSISTANT-003
- Feature: Persistent, token-aware conversation history with rolling summarization
- Test plan status: Complete
- Source spec: `specs/features/FEAT-ASSISTANT-003-chat-history/feature-spec.md`

## Acceptance criteria coverage

| AC | Description | Test level | Test file |
|----|-------------|------------|-----------|
| AC-01 | New session created when none exists | Unit | `test_chat_session_store.py` |
| AC-02 | Turns appended correctly | Unit | `test_chat_session_store.py` |
| AC-03 | Token budget respected in history injection | Unit | `test_chat_session_store.py` |
| AC-04 | Prior summary prepended as system message | Unit | `test_chat_session_store.py` |
| AC-05 | Summarization triggered at threshold | Unit | `test_chat_session_store.py` |
| AC-06 | In-memory store round-trip and user isolation | Unit | `test_chat_session_store.py` |
| AC-07 | TTL stored as days × 86400 | Unit | `test_chat_session_store.py` |
| AC-08 | Handler returns `session_id` and `history` | Integration | `test_ai_chat.py` (patch path) |
| AC-09 | `session_id` persisted in `localStorage` on frontend | Unit | `QueryContext.test.ts` |
| AC-10 | "New chat" resets session state and storage | Unit | `QueryContext.test.ts` |

## Test cases

### Unit — `tests/backend/test_chat_session_store.py`

| ID | Name | AC |
|----|------|----|
| U-01 | `test_new_session_has_required_fields` | AC-01 |
| U-02 | `test_new_session_id_is_uuid` | AC-01 |
| U-03 | `test_new_sessions_have_unique_ids` | AC-01 |
| U-04 | `test_append_turn_adds_user_turn` | AC-02 |
| U-05 | `test_append_turn_adds_assistant_turn` | AC-02 |
| U-06 | `test_append_turn_updates_updated_at` | AC-02 |
| U-07 | `test_build_history_messages_empty_session` | AC-03 |
| U-08 | `test_build_history_messages_returns_turns_within_budget` | AC-03 |
| U-09 | `test_build_history_messages_drops_oldest_turn_when_over_budget` | AC-03 |
| U-10 | `test_build_history_messages_prepends_summary` | AC-04 |
| U-11 | `test_build_history_messages_no_summary_no_system_prefix` | AC-04 |
| U-12 | `test_needs_summarization_false_below_threshold` | AC-05 |
| U-13 | `test_needs_summarization_true_at_threshold` | AC-05 |
| U-14 | `test_inmemory_store_roundtrip` | AC-06 |
| U-15 | `test_inmemory_store_returns_deep_copy` | AC-06 |
| U-16 | `test_inmemory_store_user_isolation` | AC-06 |
| U-17 | `test_inmemory_store_returns_none_for_unknown_id` | AC-06 |
| U-18 | `test_ttl_respects_env_variable` | AC-07 |
| U-19 | `test_get_chat_session_store_returns_none_without_cosmos` | Factory |
| U-20 | `test_get_chat_session_store_returns_proxy_with_cosmos` | Factory |

## Coverage notes

- Backend helper and store logic are fully covered by unit tests.
- The handler integration path (session load/save, redaction, response shape) is covered by the existing `test_ai_chat.py` suite which exercises the full endpoint with mocked OpenAI.
- Frontend `localStorage` persistence and `resetSession` are covered by the `QueryContext` test files.
- Cosmos DB path is not covered by automated tests (requires integration environment); validated manually.
