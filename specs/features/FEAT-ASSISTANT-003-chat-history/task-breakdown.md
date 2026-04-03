# Task Breakdown — FEAT-ASSISTANT-003 — AI Chat Conversation History

## Metadata

- Feature ID: FEAT-ASSISTANT-003
- Source spec: `specs/features/FEAT-ASSISTANT-003-chat-history/feature-spec.md`
- Status: Delivered

## Tasks

| ID | Task | Owner | Status |
|----|------|-------|--------|
| T-01 | Create `backend/shared/chat_session_store.py` — ChatSession helpers, in-memory store, CosmosChatSessionStore, LazyProxy, factory | Backend | Done |
| T-02 | Extend `ChatRequest` with optional `session_id` field | Backend | Done |
| T-03 | Update `ai_chat` handler to load/create session, inject token-windowed history | Backend | Done |
| T-04 | Add rolling summarization logic in handler (triggered at threshold) | Backend | Done |
| T-05 | Persist session after each turn (in-memory + Cosmos paths) | Backend | Done |
| T-06 | Return `session_id` and `history` in every response | Backend | Done |
| T-07 | Extend `AiChatResponse` type in `frontend/src/features/chat/api/ai.ts` | Frontend | Done |
| T-08 | Update `submitAiChat` to accept and forward `sessionId` | Frontend | Done |
| T-09 | Add `sessionId` state + `localStorage` persistence to `QueryContext` | Frontend | Done |
| T-10 | Expose `resetSession()` in `QueryContextType` and implement it | Frontend | Done |
| T-11 | Add "New chat" button to `Chat.tsx` wired to `resetSession` | Frontend | Done |
| T-12 | Write `tests/backend/test_chat_session_store.py` (20 unit tests) | QA | Done |
| T-13 | Update `specs/architecture/data-model.md` with `ChatSession` entity | Docs | Done |
| T-14 | Update `specs/architecture/component-view.md` (Components 11 & 12) | Docs | Done |
