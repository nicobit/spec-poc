# Feature Specification — AI Chat Conversation History

## Metadata

- Feature ID: FEAT-ASSISTANT-003
- Title: Persistent, token-aware conversation history with rolling summarization
- Status: Draft
- Owner: Engineering
- Reviewers: Product, SRE
- Related request: `specs/features/FEAT-ASSISTANT-003-chat-history/business-request.md`
- Related refinement: `specs/features/FEAT-ASSISTANT-003-chat-history/spec-refinement.md`
- Extends: FEAT-ASSISTANT-002 (`specs/features/FEAT-ASSISTANT-002-ai-chat-schedules/feature-spec.md`)
- Target release: Sprint after FEAT-ASSISTANT-002 closes

## Business Context

- **Problem statement:** The AI assistant is stateless — every request starts from scratch, forcing users to re-state context in follow-up questions with no audit record.
- **Desired outcome:** Multi-turn sessions that remember prior context, survive page refresh, bound their token cost regardless of length via rolling LLM summarization, and expire automatically.
- **Business value:** Reduces friction in incident diagnosis; enables coherent multi-step investigations; provides a lightweight audit trail.

## Scope

### In scope

- Server-side `ChatSession` entity and store (`in-memory` + Cosmos DB container `chatsessions`).
- Session lifecycle: create, read, append turns, summarize old turns, expire via TTL.
- `POST /api/ai/chat` extended: accepts optional `session_id`, returns `session_id` on every call.
- Token-budget injection: most recent turns injected up to `CHAT_HISTORY_TOKEN_BUDGET` (default 3,000 tokens).
- Rolling summarization: when `CHAT_SUMMARIZE_THRESHOLD` (default 6) un-summarized turns are older than the budget window, the LLM condenses them; the summary replaces raw turns in the prompt.
- Redaction of history turns before prompt injection.
- Frontend: `session_id` state, send on every turn, "New chat" button, display full turn list from response.
- IaC note in bootstrap docs for the `chatsessions` Cosmos container.

### Out of scope

- Cross-user session sharing.
- Session list / history sidebar in the UI (deferred to FEAT-ASSISTANT-004).
- Manual session export.
- Streaming responses.
- Per-session rate-limiting.

## Personas

- **Primary:** Support Engineer — investigates a specific client or schedule failure across multiple turns.
- **Secondary:** SRE — on-call drill-down across minutes or hours; values session persistence across page loads.
- **Tertiary:** Team Lead / Auditor — may want to review session content (read path; write path is not in scope).

## User Journeys

### Journey 1 — Multi-turn diagnosis (same tab)

- **Trigger:** Engineer opens the admin portal and types a question in the assistant panel.
- **Main flow:**
  1. First message: no `session_id` → backend creates session, returns `session_id` + answer.
  2. Second message: frontend includes `session_id` → backend loads prior turns, injects them into prompt → LLM produces context-aware answer.
  3. User asks follow-ups without repeating "client ACME" or "schedule sched-42" — the assistant already knows.
- **Alternate flow:** User clicks "New chat" → `session_id` cleared → next message starts fresh.

### Journey 2 — Session resume after refresh

- **Trigger:** Engineer closes/refreshes the browser mid-investigation.
- **Main flow:**
  1. Page reloads; frontend restores `session_id` from local storage.
  2. First message after reload includes the stored `session_id` → session is resumed transparently.
- **Alternate flow:** Session has expired (TTL elapsed) → treated as unknown → new session created, graceful degradation.

### Journey 3 — Long session with summarization

- **Trigger:** Session reaches `CHAT_SUMMARIZE_THRESHOLD` turns older than the history budget window.
- **Main flow:**
  1. Backend detects threshold exceeded on next request.
  2. One LLM call compresses old turns into a summary paragraph stored on the session document.
  3. Following prompts inject the summary as the first history entry + most recent turns within budget.
  4. User sees no visible change; token usage stays bounded.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| `REQ-001` | `POST /api/ai/chat` accepts an optional `session_id` string field in the request body. |
| `REQ-002` | If `session_id` is absent or the session is not found, the backend creates a new session. |
| `REQ-003` | Every response includes `session_id`. |
| `REQ-004` | Session turns are stored with: `role` (`user`/`assistant`), `content`, `token_count` (estimated), `timestamp` (ISO UTC). |
| `REQ-005` | On each request, turns are loaded and injected into `messages[]` in chronological order, walking backward from most recent until `CHAT_HISTORY_TOKEN_BUDGET` tokens are consumed. |
| `REQ-006` | When the count of un-summarized turns outside the current prompt window reaches `CHAT_SUMMARIZE_THRESHOLD`, a single LLM call is made to produce a rolling summary. |
| `REQ-007` | The rolling summary is stored as a `summary` field on the session document and, when present, injected as the first history entry before recent turns. |
| `REQ-008` | Sessions are created with a TTL of `CHAT_SESSION_TTL_DAYS` days (default 7). |
| `REQ-009` | When `COSMOS_CONNECTION_STRING` is absent the implementation falls back to an in-memory store with the same interface. |
| `REQ-010` | All history content is passed through `redact_text` before prompt injection. |
| `REQ-011` | `CHAT_HISTORY_TOKEN_BUDGET`, `CHAT_SUMMARIZE_THRESHOLD`, and `CHAT_SESSION_TTL_DAYS` are read from environment variables with documented defaults. |
| `REQ-012` | A warning is logged when the full history budget is reached to aid observability. |
| `REQ-013` | Frontend sends `session_id` on every turn after it is first received. |
| `REQ-014` | Frontend persists `session_id` in `localStorage` so sessions survive page refresh. |
| `REQ-015` | Frontend "New chat" button clears `session_id` from state and storage; next message starts a new session. |
| `REQ-016` | The full turn list is returned in the response so the frontend can render it without reconstructing from local state. |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| `NFR-001` | Summarization adds at most one additional LLM call per `CHAT_SUMMARIZE_THRESHOLD` user turns — average overhead per turn is negligible. |
| `NFR-002` | Session read + write must complete in under 300ms on the Cosmos path (p99) so total request latency stays tolerable. |
| `NFR-003` | No raw PII may be persisted in session documents — redaction is applied before storage. |
| `NFR-004` | Session documents stored in Cosmos must use TTL; no manual cleanup jobs. |
| `NFR-005` | The feature must be backward-compatible: requests without `session_id` continue to behave exactly as in FEAT-ASSISTANT-002. |

## UX And Accessibility Notes

- The chat panel shows the full conversation history visually.
- The "New chat" button is clearly labelled and resets both the displayed history and the server session.
- On page load, if a stored `session_id` exists, the most recent session is resumed silently (no prompt to the user).
- If the session has expired, the panel starts fresh without an error — a subtle indicator ("Starting new session") is acceptable.
- Screen reader: turn history rendered as a live region (`aria-live="polite"`) so new answers are announced.

## Authorization And Roles

- Authentication required: Yes — same RBAC as FEAT-ASSISTANT-002.
- Public exceptions: None.
- Allowed roles: Any authenticated portal user (same as current `/api/ai/chat`).
- Restricted actions: Session content is scoped to the owning user — the backend enforces `userId` on all session reads and writes.
- Access-control docs to update: None — no new roles or routes introduced.

## Data And API Impact

### New entity: `ChatSession`

```
ChatSession {
  id: str                   # UUID, session document ID
  userId: str               # partition key — authenticated user identity
  createdAt: str            # ISO UTC timestamp
  updatedAt: str            # ISO UTC timestamp
  summary: str | None       # rolling LLM summary of old turns
  summarizedUpTo: int       # index of last turn included in the summary
  turns: [
    {
      role: "user" | "assistant"
      content: str          # redacted
      token_count: int      # heuristic estimate
      timestamp: str        # ISO UTC
    }
  ]
  ttl: int                  # Cosmos TTL in seconds
}
```

### Changed: `POST /api/ai/chat` request

```
// Before (FEAT-ASSISTANT-002)
{ message: str, filters?: dict, includeRemediation?: bool }

// After (FEAT-ASSISTANT-003)
{ message: str, filters?: dict, includeRemediation?: bool, session_id?: str }
```

### Changed: `POST /api/ai/chat` response

```
// Before (FEAT-ASSISTANT-002)
{ answer: str, remediation: [str], references: [...] }

// After (FEAT-ASSISTANT-003)
{ answer: str, remediation: [str], references: [...], session_id: str, history: [{role, content, timestamp}] }
```

### New Cosmos container

- Name: `chatsessions`
- Partition key: `/userId`
- TTL: enabled, default 7 days (604800 seconds)
- Indexed: `/userId`, `/createdAt`, `/updatedAt`

### Storage fallback

- Module-level dict `CHAT_SESSIONS: Dict[str, dict]` in `backend/shared/chat_session_store.py` when Cosmos is unavailable.

## Edge Cases

- **Unknown session_id:** Create a new session silently. Log a warning. Return the new `session_id`.
- **Empty history:** Session exists but has no turns yet — inject nothing, behave as FEAT-ASSISTANT-002.
- **Summarization LLM failure:** Log error; skip summarization and use raw budget-trimmed turns. Do not block the user's request.
- **Budget hit with only 1 turn:** Log warning; inject that one turn (it may slightly exceed budget — acceptable as a soft limit).
- **Cosmos unavailable mid-request:** Fall back gracefully — answer the question using in-memory state; log error; do not return 500 to the user.

## Acceptance Criteria

| ID | Acceptance Criterion |
| --- | --- |
| `AC-001` | A second request with a valid `session_id` produces an answer that uses context from turn 1 without the user repeating it (verified by unit test). |
| `AC-002` | A request with an unknown `session_id` returns 200, creates a new session, and returns a new `session_id`. |
| `AC-003` | After `CHAT_SUMMARIZE_THRESHOLD` turns, the session document has a non-empty `summary` field and the injected prompt includes it. |
| `AC-004` | The history injected into the prompt never exceeds `CHAT_HISTORY_TOKEN_BUDGET` estimated tokens. |
| `AC-005` | Sessions stored in Cosmos have TTL set correctly. |
| `AC-006` | Requests with no `session_id` behave identically to FEAT-ASSISTANT-002 (backward compat). |
| `AC-007` | Redacted content is stored — a turn containing a simulated email address stores it redacted. |
| `AC-008` | "New chat" in the frontend clears `session_id`; the following request creates a distinct new session. |
| `AC-009` | If the session TTL has elapsed and the session is not found, a new session is created without error. |
| `AC-010` | Unit tests cover: create, resume, budget windowing, summarization trigger, fallback store, redaction. |

## Traceability Matrix

| Acceptance Criterion | Requirement(s) | Test |
| --- | --- | --- |
| AC-001 | REQ-001, REQ-005 | `test_session_resume_uses_history` |
| AC-002 | REQ-002, REQ-003 | `test_unknown_session_id_creates_new` |
| AC-003 | REQ-006, REQ-007 | `test_summarization_trigger` |
| AC-004 | REQ-005, REQ-011 | `test_token_budget_windowing` |
| AC-005 | REQ-008 | `test_cosmos_session_ttl` |
| AC-006 | REQ-001 | `test_no_session_id_backward_compat` |
| AC-007 | REQ-010 | `test_session_history_is_redacted` |
| AC-008 | REQ-013, REQ-015 | Frontend: `test_new_chat_resets_session` |
| AC-009 | REQ-002 | `test_expired_session_creates_new` |
| AC-010 | REQ-002–016 | `test_chat_session_store_*` suite |
