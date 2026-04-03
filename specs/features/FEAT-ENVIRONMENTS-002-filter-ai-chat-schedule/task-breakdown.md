# Task Breakdown — FEAT-ENVIRONMENTS-002 — Filter AI Chat Schedule Answers by Environment

## Metadata

- Feature ID: FEAT-ENVIRONMENTS-002
- Source spec: `specs/features/FEAT-ENVIRONMENTS-002-filter-ai-chat-schedule/feature-spec.md`
- Status: Delivered

## Tasks

| ID | Task | Owner | Status |
|----|------|-------|--------|
| T-01 | Update `ChatRequest` Pydantic model to accept `filters` dict | Backend | Done |
| T-02 | Update `_build_catalog()` to apply `environmentId` / `environmentName` filter | Backend | Done |
| T-03 | Write unit tests for `_build_catalog` with and without filters | Backend | Done |
| T-04 | Write unit tests for tool dispatcher (`_execute_tool`) | Backend | Done |
| T-05 | Write integration test for full tool-calling loop via endpoint | Backend | Done |
| T-06 | Update API spec `api-spec.md` to document `filters` field | Docs | Done |
