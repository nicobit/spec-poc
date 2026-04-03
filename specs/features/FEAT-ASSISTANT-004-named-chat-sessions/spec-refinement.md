# Spec Refinement — Named Chat Sessions with Session Switcher

## Source

- Business request: `specs/features/FEAT-ASSISTANT-004-named-chat-sessions/business-request.md`
- Related documents:
  - `specs/features/FEAT-ASSISTANT-003-chat-history/feature-spec.md` (explicit deferral origin)
  - `specs/features/FEAT-ASSISTANT-003-chat-history/api-spec.md`
  - `backend/shared/chat_session_store.py`
  - `frontend/src/features/chat/contexts/QueryContext.tsx`
  - `frontend/src/features/chat/components/ChatSidebar.tsx`
  - `frontend/src/features/chat/components/Chat.tsx`

## Business Intent Summary

- **Problem summary:** Session storage exists server-side but is invisible in the UI. Users cannot find, name, or switch between past sessions.
- **Desired business outcome:** A session sidebar that lists the authenticated user's sessions by name, supports switching, and allows naming/renaming.
- **Affected users:** Support Engineers, SREs, Team Leads / Auditors.

## Clarified Scope

### In scope

- Backend: `GET /api/ai/sessions` — list sessions for the current user (id, name, createdAt, updatedAt, turn count).
- Backend: `PATCH /api/ai/sessions/{session_id}` — rename a session.
- Backend: `GET /api/ai/sessions/{session_id}` — load full turn list for a past session.
- Backend: `DELETE /api/ai/sessions/{session_id}` — delete a session (owner-scoped).
- Backend: `POST /api/ai/chat` extended to accept an optional `name` field when creating a new session.
- `ChatSession` document gains a `name` field (auto-populated on creation if not supplied).
- Frontend: replace the current `ChatSidebar` (which only lists queries within one session) with a session-list sidebar.
- Frontend: session list shows name, relative date, and an indicator for the currently active session.
- Frontend: "New chat" dialog (or inline prompt) allows the user to optionally provide a session name before creating.
- Frontend: clicking a past session loads its turns and makes it the active session.
- Frontend: inline rename of a session name (e.g. clicking the name in the sidebar makes it editable).
- Frontend: delete session from sidebar (with confirmation).
- `QueryContext` extended to hold the active session's loaded turns and session metadata.

### Out of scope

- Session sharing between users.
- Full-text search across session content.
- Exporting sessions.
- Pagination beyond a reasonable list limit (max 50 most-recent sessions, newest first).
- Streaming responses.
- Admin view of other users' sessions.

## Ambiguities Identified

1. **Auto-name strategy:** Should the system use the first user message, a timestamp, or both? Decision deferred to UX review but default assumption is `"Chat — <date> <time>"` as fallback if no name supplied.
2. **Load behaviour when switching:** Load full turn list from server, or only the summarized view? Recommendation: load full `turns` array (server-side should limit to the token-budget window to avoid huge payloads).
3. **Active session indicator:** Should the current tab/browser session show the active session differently from one loaded from history? For now: highlight the active session in the sidebar.
4. **Continuation semantics:** When the user switches to a past session and sends a new message, does the backend append to it? Answer: yes — the session_id is still valid and turns can be appended. The frontend simply uses the loaded session's `session_id` as the active one.
5. **Max sessions per user:** No hard limit enforced on write now; list API caps at 50 most-recent. Future enforcement is out of scope.

## Assumptions

- `chatsessions` Cosmos container (from FEAT-ASSISTANT-003) is already provisioned.
- `ChatSession` documents are partitioned by `/userId`; list query uses a filter on `userId`.
- The `name` field is an optional string on the document; if absent, a default is generated on creation.
- All session endpoints are authenticated; the backend validates that the requesting user's `userId` matches the session's stored `userId`.
- The existing "New chat" button in `Chat.tsx` is replaced or extended — not a separate entry point.
- Frontend loads the session list on mount of the chat area; list is refreshed after creating or deleting a session.
- Renaming calls `PATCH` immediately (no separate save button); debounced or on blur.

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Session list sidebar shows all sessions for the authenticated user, newest first, up to 50. |
| AC-002 | Each session row shows: name (or auto-name), relative creation date, and an "active" indicator when it is the current session. |
| AC-003 | "New chat" opens a prompt (inline or dialog) where the user can optionally name the session; leaving it blank generates an auto-name. |
| AC-004 | Clicking a past session in the sidebar loads its turns and makes it the active session; subsequent messages append to it. |
| AC-005 | Inline rename updates the name on blur and persists to the backend immediately. |
| AC-006 | Deleting a session removes it from the list; if it was the active session, the UI switches to "no active session" (blank state). |
| AC-007 | All session endpoints return 403 if the requesting user does not own the session. |
| AC-008 | Session list and session operations work with both in-memory and Cosmos backends. |

## Resolved Decisions

1. **Maximum session name length:** 120 characters. Enforced on the client (input `maxLength`) and validated on the backend.
2. **Cross-tab auto-refresh:** No. The session list does not auto-refresh when a second browser tab creates a new session. Manual refresh (or page reload) only.
3. **Delete strategy:** Hard-delete. The Cosmos document is removed immediately. No soft-delete or tombstone record.
