# Spec Refinement — AI Chat Conversation History (FEAT-ASSISTANT-003)

## Source

- Business request: `specs/features/FEAT-ASSISTANT-003-chat-history/business-request.md`
- Related documents:
  - `specs/features/FEAT-ASSISTANT-002-ai-chat-schedules/feature-spec.md`
  - `specs/architecture/data-model.md`
  - `backend/function_ai_chat/__init__.py`
  - `backend/shared/execution_store.py` (LazyProxy pattern reference)

## Business Intent Summary

- **Problem summary:** Each AI chat request is stateless. Users cannot ask follow-up questions without re-stating context, and there is no record of a diagnostic session.
- **Desired business outcome:** Multi-turn sessions that remember prior context, survive page refresh, stay within token limits regardless of session length, and are automatically archived for potential audit.
- **Affected users:** Support Engineers, SREs, and any admin portal operator using the AI assistant for incident investigation.

## Clarified Scope

### In scope

- Server-side session store: a new `ChatSession` entity storing session ID, user, turns (role + content + token count), and an optional rolling summary.
- Session lifecycle: create on first message, return `session_id` in every response, accept `session_id` on subsequent requests to continue.
- Token-budget enforcement: on each request load recent turns walking backwards until a configurable budget (`CHAT_HISTORY_TOKEN_BUDGET`, default 3,000) is reached; inject only those turns into the prompt.
- Rolling summarization: when the oldest un-summarized turns are about to be discarded from the prompt window, first call the LLM to compress them into a brief paragraph stored as a `summary` field on the session; future requests inject the summary as a synthetic user/assistant turn before recent turns.
- Redaction: the same `redact_text` pipeline applied to catalog + tool results is applied to history turns before prompt injection.
- Local dev fallback: in-memory session store used when `COSMOS_CONNECTION_STRING` is absent (mirrors existing `execution_store.py` pattern).
- Cosmos container: `chatsessions` — one document per session, TTL configurable via `CHAT_SESSION_TTL_DAYS` (default 7).
- Frontend: send `session_id` with every message after turn 1; display full turn list from response; provide "New chat" button that clears `session_id`.
- Summarization trigger: when persisted turns that are older than the token-budget window number ≥ `CHAT_SUMMARIZE_THRESHOLD` (default 6), run the summarization pass before the next prompt is built.

### Out of scope

- Cross-user session sharing.
- Manual session export / download.
- Streaming responses.
- Per-session rate-limiting.
- Session search or filtering in the UI beyond "most recent session" restore.

## Ambiguities Identified

- **A1 — Token counting:** GPT-3.5 uses ~4 chars/token as a rough heuristic. Should we use `tiktoken` for precision, or the heuristic? Using `tiktoken` requires adding a dependency; heuristic is acceptable for a budget guard.
- **A2 — Summarization model:** Should the summarization call use the same model as the chat, or a cheaper/faster model? Using the same model (`gpt-3.5-turbo`) is simpler and consistent.
- **A3 — UI session restore behavior:** Should the app auto-restore the most recent session on page load, or always start fresh and offer a "resume" prompt? Auto-restore is more practical for the incident-response use case.
- **A4 — Who owns the summary prompt?** The `PromptManager` was removed in FEAT-ASSISTANT-002. The summarization prompt will be a short inline string in the session store helper, not a separate template file.

## Assumptions

1. Token counting uses a simple heuristic (`len(content) // 4`) rather than `tiktoken` to avoid a new dependency. The budget is conservative enough that the approximation is safe.
2. The summarization LLM call uses the same Azure OpenAI endpoint and model as the chat call, via `OpenAIService.chat_with_tools(tools=[])`.
3. A session is scoped to a single authenticated user. The session document's partition key is `userId`.
4. The in-memory fallback stores sessions in a module-level dict (`CHAT_SESSIONS`) keyed by `session_id`, consistent with `STAGE_EXECUTIONS` and `CLIENTS` patterns.
5. The Cosmos container `chatsessions` is provisioned by the existing IaC; a note will be added to the bootstrap doc.
6. The frontend identifies the current user via the existing `useCurrentUser` hook; it passes `session_id` in the request body, not a header.
7. PII redaction is applied to history turns before injection, using the existing `redact_text` helper; raw unredacted turns are not persisted.

## Candidate Requirements

| ID | Requirement |
| --- | --- |
| `REQ-001` | `POST /api/ai/chat` accepts an optional `session_id` field in the request body. |
| `REQ-002` | If `session_id` is absent or not found, a new session is created and its ID is returned in the response. |
| `REQ-003` | The response body includes `session_id` on every call. |
| `REQ-004` | Session turns are stored server-side with fields: `role`, `content`, `token_count`, `timestamp`. |
| `REQ-005` | On each request, history turns are loaded and injected into `messages[]` in order, bounded by `CHAT_HISTORY_TOKEN_BUDGET` (default 3,000 tokens). |
| `REQ-006` | When the number of un-summarized turns older than the budget window reaches `CHAT_SUMMARIZE_THRESHOLD` (default 6), the LLM is called to summarize them before the next prompt is assembled. |
| `REQ-007` | The rolling summary is stored as a `summary` field on the session document and injected as the first history message on subsequent requests. |
| `REQ-008` | Sessions expire after `CHAT_SESSION_TTL_DAYS` (default 7) days. |
| `REQ-009` | In-memory fallback is used when `COSMOS_CONNECTION_STRING` is not set. |
| `REQ-010` | All history content is passed through `redact_text` before prompt injection. |
| `REQ-011` | The frontend sends `session_id` on every turn after turn 1. |
| `REQ-012` | The frontend displays full turn history from the response (not reconstructed from local state). |
| `REQ-013` | A "New chat" button clears `session_id` from frontend state and starts a fresh session. |

## Candidate Acceptance Criteria

| ID | Acceptance Criterion |
| --- | --- |
| `AC-001` | A second turn sent with a valid `session_id` receives an answer that demonstrably uses context from turn 1 without the user repeating it. |
| `AC-002` | A request with an unknown `session_id` creates a new session (no error) and returns a new `session_id`. |
| `AC-003` | After `CHAT_SUMMARIZE_THRESHOLD` turns, the session document contains a non-empty `summary` field and the prompt sent to the LLM includes it. |
| `AC-004` | The prompt injected to the LLM never exceeds `CHAT_HISTORY_TOKEN_BUDGET` tokens of history content. |
| `AC-005` | Sessions stored in Cosmos have a TTL set to `CHAT_SESSION_TTL_DAYS`. |
| `AC-006` | Unit tests cover: new session creation, session resume, token-budget windowing, summarization trigger, in-memory fallback, redaction applied to history. |
| `AC-007` | `POST /api/ai/chat` continues to work correctly with no `session_id` (backward compatible). |
| `AC-008` | Frontend "New chat" resets history display and `session_id`. |

## Risks And Dependencies

- **Risk 1 — Extra LLM call cost:** The summarization call adds one LLM round-trip every `CHAT_SUMMARIZE_THRESHOLD` turns. For typical short sessions (≤6 turns) this never fires. Acceptable.
- **Risk 2 — Cosmos schema evolution:** Adding a new `chatsessions` container is an IaC change. Must be documented in `docs/standards/platform/appservice-bootstrap.md`.
- **Risk 3 — Context window mismatch:** If token budget + catalog + tool results approaches the model limit, answers degrade silently. The 3,000-token history budget is conservative; a warning log should fire when budget is hit.
- **Dependency 1:** FEAT-ASSISTANT-002 must be fully deployed. This feature extends the handler and response model defined there.
- **Dependency 2:** Cosmos and managed identity access must already be configured; this feature only adds a new container.

## Recommended Next Artifacts

- Feature spec (this refinement → `feature-spec.md`)
- API spec update (`api-spec.md` — extend `ChatRequest` and `ChatResponse` schemas)
- ADR: rolling summary pattern vs. fixed sliding window (lightweight)
- Test plan
- Task breakdown

## Approval Summary For Business Review

- **Proposed feature outcome:** Users can have natural multi-turn diagnostic conversations with the AI assistant; sessions persist across page refresh; token costs are automatically bounded by a rolling LLM summary regardless of how long the session grows.
- **Key behaviors:** session creation + resumption; bounded history injection; automatic rolling summarization at threshold; 7-day TTL; backward-compatible API.
- **Confirmed non-scope:** streaming, cross-user sharing, export, rate-limiting.
- **Open decisions requiring business input:**
  - Default TTL (7 days proposed) — acceptable?
  - Should past sessions be visible as a list in the UI (history sidebar), or only the most recent one auto-restored?
