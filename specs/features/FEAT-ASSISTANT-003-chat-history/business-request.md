# Business Request — AI Chat Conversation History

## Request Summary

- Title: Persistent, token-aware conversation history with rolling summarization for the AI assistant
- Requested by: Product / Engineering
- Date: 2026-04-03

## Business Problem

The current AI chat assistant treats every user message as a standalone, stateless request. The LLM has no memory of what was asked or answered earlier in the same working session.

This creates two friction points:

1. **Context loss** — a user investigating a recurring failure has to re-state relevant facts ("client ACME", "schedule sched-42", "last 24h") on every follow-up question, even when the previous turn already established that context.
2. **No session record** — when a support engineer hands a session off or returns later, the diagnostic conversation is gone. There is no audit trail of what the assistant said or what data it used.

## Users And Impact

- **Support Engineers** — need multi-turn diagnostic flows: "Why did it fail?" → "Was this a recurring pattern?" → "What remediation steps have been tried?". Today each question starts fresh.
- **SREs on-call** — investigate incidents across multiple minutes or hours; rely on follow-up questions to drill in based on earlier answers.
- **Team Leads / Auditors** — may need to review what the assistant recommended during an incident.

## Desired Outcome

- The assistant remembers prior turns in the current working session and uses them to answer follow-up questions without re-stating context.
- When a session grows long, the oldest turns are compressed by the LLM into a brief summary so that token costs remain bounded regardless of session length.
- Sessions are stored server-side so they survive page refresh and can be reviewed.
- Sessions expire automatically after a configurable period (default 7 days) to control storage.
- Users can start a new session explicitly (reset context) via a "New chat" action.

## Example Scenarios

- **Scenario 1 — Multi-turn diagnosis:**
  - Turn 1: "Why did schedule sched-42 fail yesterday?"
  - Turn 2 (follow-up): "Was it a recurring pattern over the last month?" — the assistant already knows which schedule was being discussed; no need to repeat it.
  - Turn 3: "What remediation steps have been tried?" — the assistant continues in context.

- **Scenario 2 — Session resume:**
  - Engineer closes the browser mid-investigation, returns 30 minutes later.
  - The assistant panel restores the previous session automatically (no knowledge is lost).

- **Scenario 3 — Long session:**
  - Session grows to 15+ turns.
  - The token overhead stays within model limits because the oldest turns are replaced with a compact LLM-generated summary.
  - The user still sees full history in the UI; only the prompt is compressed.

## Priority And Timing

- Priority: Medium — follow-on to FEAT-ASSISTANT-002 (two-tier context + tool-calling). Must not disrupt existing behavior.
- Desired timeline: Next sprint after FEAT-ASSISTANT-002 closes.

## Constraints

- Token budget: the combined catalog (Tier 1) + tool results (Tier 2) + history already occupies ~1,000–2,000 tokens; history must not push the total above ~12,000 tokens (well inside the 16k gpt-3.5-turbo window).
- No new external services: use Cosmos DB (already provisioned) for session storage; fall back to in-memory for local dev.
- Session data must not contain raw PII — same redaction policy as the rest of the chat pipeline.
- The summarization step must be an LLM call, not a heuristic, to ensure quality compression.

## Out Of Scope

- Cross-user shared sessions.
- Full conversation export or download.
- Real-time streaming responses.
- Rate-limiting per session (already deferred in FEAT-ASSISTANT-002).

## Additional Context

- Existing feature: `specs/features/FEAT-ASSISTANT-002-ai-chat-schedules/feature-spec.md`
- Architecture: "rolling summary" pattern — when the oldest turns exceed a token budget threshold, call the LLM once to summarize them into a synthetic `system` message; then discard the raw turns from the prompt (but keep them in the stored record for UI display).
- Rolling summarization is the most token-efficient pattern for long sessions and is well-established in OpenAI application design.
