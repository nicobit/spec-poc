# Test Plan — FEAT-ENVIRONMENTS-002 — Filter AI Chat Schedule Answers by Environment

## Metadata

- Feature ID: FEAT-ENVIRONMENTS-002
- Feature: Filter AI chat schedule answers by environment
- Test plan status: Complete
- Source spec: `specs/features/FEAT-ENVIRONMENTS-002-filter-ai-chat-schedule/feature-spec.md`

## Acceptance criteria coverage

| AC | Description | Test level | Test file |
|----|-------------|------------|-----------|
| AC-01 | API accepts `filters.environmentId` and `filters.environmentName` | Unit + Integration | `test_ai_chat_env_filter.py` |
| AC-02 | Filtering by env id restricts schedules and executions in catalog | Unit | `test_ai_chat_env_filter.py` |
| AC-03 | Filtering by env name restricts schedules and executions | Unit | `test_ai_chat_env_filter.py` |
| AC-04 | Mismatch between schedule and environment filter is handled | Unit | `test_ai_chat_env_filter.py` |
| AC-05 | No filter → legacy behaviour unchanged | Unit | `test_ai_chat_env_filter.py` |

## Test cases

### Unit — `tests/backend/test_ai_chat_env_filter.py`

| ID | Name | AC |
|----|------|----|
| U-01 | `test_build_catalog_no_filter` | AC-05 |
| U-02 | `test_build_catalog_filters_by_environment_id` | AC-02 |
| U-03 | `test_build_catalog_filters_by_environment_name` | AC-03 |
| U-04 | `test_build_catalog_empty_filter_returns_all` | AC-05 |
| U-05 | `test_execute_tool_get_recent_executions` | AC-01 |
| U-06 | `test_execute_tool_get_failure_summary` | AC-01 |
| U-07 | `test_execute_tool_list_failed_executions` | AC-01 |
| U-08 | `test_execute_tool_unknown_tool` | AC-01 |
| U-09 | `test_ai_chat_uses_tool_loop` | AC-01, AC-02 |

## Coverage notes

- All ACs are covered by the unit test suite.
- The tool-calling loop integration test validates that environment filters propagate through the full request flow.
- No end-to-end tests are added; the UI change is out of scope for this feature.
