# Feature Specification — Named Chat Sessions with Session Switcher

## Metadata

- Feature ID: FEAT-ASSISTANT-004
- Title: Named chat sessions with history sidebar and session switcher
- Status: Draft
- Owner: Engineering
- Reviewers: Product, UX, SRE
- Related request: `specs/features/FEAT-ASSISTANT-004-named-chat-sessions/business-request.md`
- Related refinement: `specs/features/FEAT-ASSISTANT-004-named-chat-sessions/spec-refinement.md`
- Extends: FEAT-ASSISTANT-003 (`specs/features/FEAT-ASSISTANT-003-chat-history/feature-spec.md`)
- Target release: Sprint after FEAT-ASSISTANT-003 is validated in production

## Business Context

- **Problem statement:** Session storage shipped in FEAT-ASSISTANT-003 is invisible to the user. Sessions have no names and cannot be found, switched, or managed.
- **Desired outcome:** A sessions sidebar in the chat area that lists named sessions, supports switching between them, and allows creating, renaming, and deleting sessions.
- **Business value:** Enables parallel investigations (separate named threads), session resumability after page refresh or tab close, and a lightweight audit trail for team leads.

## Scope

### In scope

- `ChatSession` document schema extended with `name: str`.
- Backend store helpers extended with `list_sessions`, `rename_session`, `delete_session`.
- New HTTP endpoints:
  - `GET /api/ai/sessions` — list sessions for the current user.
  - `PATCH /api/ai/sessions/{session_id}` — rename a session.
  - `GET /api/ai/sessions/{session_id}` — load full turns for a session.
  - `DELETE /api/ai/sessions/{session_id}` — delete a session.
- `POST /api/ai/chat` extended to accept optional `name` on first turn (session creation).
- Frontend: `ChatSidebar` replaced with `SessionSidebar` (session list with create/rename/delete).
- Frontend: "New chat" flow — optional name input before creating.
- Frontend: click on past session loads its turns into the active view.
- Frontend: inline rename in the sidebar.
- Frontend: delete with confirmation.
- `QueryContext` extended: `sessions` list, `loadSession`, `deleteSession`, `renameSession`.

### Out of scope

- Cross-user session sharing.
- Full-text search across session content.
- Session export.
- Pagination (cap at 50 most-recent sessions).
- Admin view of other users' sessions.
- Streaming responses.

## Personas

- **Primary:** Support Engineer — runs multiple parallel investigations and needs to name, switch, and resume them.
- **Secondary:** SRE on-call — starts a session, handles another alert, returns to prior thread.
- **Tertiary:** Team Lead / Auditor — browses past sessions by name to review recommendations.

## User Journeys

### Journey 1 — Create and name a new session

1. User is in the chat area. They click "New chat".
2. A small inline prompt appears: "Session name (optional)" with a text input and a "Start" button.
3. User types "ACME timeout — 2026-04-03" and clicks Start.
4. Frontend calls `POST /api/ai/chat` with `name: "ACME timeout — 2026-04-03"` on the first message; backend creates session with that name.
5. Session appears at the top of the sidebar; it is highlighted as active.

### Journey 2 — Switch to a past session

1. User sees "ACME timeout — 2026-04-03" in the sidebar from a previous day.
2. They click it; frontend calls `GET /api/ai/sessions/{session_id}`.
3. Turn list loads into the chat view. The session is now active.
4. User types a follow-up message; it is appended to the existing session.

### Journey 3 — Rename a session

1. User clicks the name "Chat — 2026-04-03 14:22" in the sidebar.
2. The name becomes an editable input pre-filled with the current name.
3. User types a new name and presses Enter or clicks away.
4. Frontend calls `PATCH /api/ai/sessions/{session_id}` with `{ "name": "..." }`.
5. Sidebar updates immediately.

### Journey 4 — Delete a session

1. User hovers a session row; a delete icon appears.
2. User clicks it; a confirmation tooltip/dialog appears: "Delete this session? This cannot be undone."
3. User confirms; frontend calls `DELETE /api/ai/sessions/{session_id}`.
4. Session is removed from the list. If it was the active session, the view resets to a blank "no session" state.

## Functional Requirements

| ID | Requirement |
|----|-------------|
| REQ-001 | `ChatSession` document must include a `name` field (string, max 120 chars). If not supplied on creation, the system generates `"Chat — <ISO date> <HH:MM>"`. |
| REQ-002 | `chat_session_store` must expose `list_sessions(user_id, limit=50)` returning sessions ordered by `updatedAt` descending. |
| REQ-003 | `chat_session_store` must expose `rename_session(session_id, user_id, name)` that validates ownership and updates the `name` field. |
| REQ-004 | `chat_session_store` must expose `delete_session(session_id, user_id)` that validates ownership and removes the document. |
| REQ-005 | `GET /api/ai/sessions` must return the session list for the authenticated user only. |
| REQ-006 | `PATCH /api/ai/sessions/{session_id}` must return 403 if the requesting user does not own the session. |
| REQ-007 | `GET /api/ai/sessions/{session_id}` must return the session's turns (bounded to `CHAT_HISTORY_TOKEN_BUDGET`) and return 403 if not the owner. |
| REQ-008 | `DELETE /api/ai/sessions/{session_id}` must return 403 if not the owner and 204 on success. |
| REQ-009 | `POST /api/ai/chat` must accept an optional `name` field; if provided and `session_id` is absent, the new session is created with that name. |
| REQ-010 | Frontend `SessionSidebar` must list sessions ordered newest first, showing name and relative date. |
| REQ-011 | Frontend must highlight the currently active session in the sidebar. |
| REQ-012 | Frontend must provide an inline name input on "New chat" (optional; blank → auto-name). |
| REQ-013 | Frontend must load and display turns when a past session is selected. |
| REQ-014 | Frontend inline rename must call `PATCH` on blur or Enter and update the sidebar immediately. |
| REQ-015 | Frontend delete must show a confirmation step before calling `DELETE`. |
| REQ-016 | All session management endpoints must be authenticated; `userId` from the token is the enforced owner identifier. |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-001 | List endpoint must respond in under 500 ms for up to 50 sessions under normal Cosmos latency. |
| NFR-002 | Session load (`GET /api/ai/sessions/{id}`) must return in under 1 s. |
| NFR-003 | Session name input must be capped at 120 characters on the client (HTML `maxLength`) and rejected with 400 on the backend if exceeded. |
| NFR-004 | Session list must be loadable with both in-memory and Cosmos backends (parity requirement). |
| NFR-005 | Delete operation must be idempotent: a 404 on a missing session is acceptable and should not surface as an error to the user. |

## UX And Accessibility Notes

- The sidebar should be scannable: show name prominently and date secondary in smaller text.
- Inline rename input must be keyboard-accessible (Enter = confirm, Escape = cancel).
- Delete icon should only appear on hover/focus to avoid visual clutter, but must be reachable via keyboard (Tab/Enter) for accessibility.
- Active session should have a visually distinct indicator (accent border or background colour), not colour alone (contrast requirement).
- Loading state for session switch should show a spinner in the chat area, not a full-page loader.
- "New chat" prompt should auto-focus the name input when it appears.
- Empty state: if no sessions exist, show "No past sessions" with a CTA to start one.

## Authorization And Roles

- Authentication required: yes — all session endpoints and the list RPC.
- Public exceptions: none.
- Allowed roles: any authenticated portal user.
- Restricted actions: a user may only read, rename, or delete sessions where their `userId` matches the session's `userId` partition key.
- Access-control docs to update: `docs/standards/security/access-control-matrix.md`, `docs/standards/security/module-authorization.md`.

## Data Model Changes

### `ChatSession` document (delta from FEAT-ASSISTANT-003)

```
{
  "id": "<uuid>",
  "userId": "<oid>",
  "name": "<string, max 120>",          ← NEW
  "createdAt": "<ISO 8601>",
  "updatedAt": "<ISO 8601>",
  "summary": "<string | null>",
  "summarizedUpTo": <int>,
  "turns": [ { "role": "...", "content": "...", "ts": "..." } ],
  "ttl": <seconds>
}
```

Existing documents without `name` must be handled gracefully (treated as auto-named using `createdAt`).

## API Summary

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/ai/sessions` | List sessions for authenticated user |
| `POST` | `/api/ai/chat` | Unchanged path; `name` field added for session creation |
| `GET` | `/api/ai/sessions/{session_id}` | Load session turns |
| `PATCH` | `/api/ai/sessions/{session_id}` | Rename session |
| `DELETE` | `/api/ai/sessions/{session_id}` | Delete session |

Full contract to be documented in `api-spec.md` (not required before approval).

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | Session list sidebar shows all sessions for the authenticated user, newest first, up to 50. |
| AC-002 | Each row shows name and relative creation date; active session is visually distinguished. |
| AC-003 | "New chat" flow allows optional session name; blank name generates `"Chat — <date> <time>"`. |
| AC-004 | Clicking a past session loads its turns and makes it the active session; new messages append to it. |
| AC-005 | Inline rename persists immediately and updates the sidebar. |
| AC-006 | Delete with confirmation removes the session; if active, the view resets to blank. |
| AC-007 | All session endpoints return 403 for ownership mismatch. |
| AC-008 | Session list and operations work with both in-memory and Cosmos backends. |
| AC-009 | Existing sessions without `name` are rendered with a graceful default (auto-name from `createdAt`). |

## Dependencies And Risks

- **Dependency:** FEAT-ASSISTANT-003 must be deployed and the `chatsessions` container must exist.
- **Risk:** Cosmos list query (`SELECT * FROM c WHERE c.userId = @uid ORDER BY c.updatedAt DESC`) requires a cross-partition query if sessions span multiple logical partitions. Since `/userId` is the partition key, all sessions for one user are co-located — no cross-partition query needed.
- **Risk:** In-memory store has no persistence across restarts; `list_sessions` will return an empty list after a restart. This is acceptable for local development.
- **Risk:** Renaming a session that was summarized does not affect the summary text — this is acceptable.
- **Decision:** Delete is a hard-delete (document removed from Cosmos). No soft-delete or tombstone. TTL-based expiry already handles passive cleanup.
- **Decision:** Session list does not auto-refresh across browser tabs. Users must reload to see sessions created in another tab.
