# Business Request — Named Chat Sessions with Session Switcher

## Request Summary

- Title: Named chat sessions with history sidebar and session switcher
- Requested by: Product
- Date: 2026-04-03

## Business Problem

FEAT-ASSISTANT-003 shipped persistent server-side session storage and a "New chat" button, but every new session is anonymous and the old ones are invisible to the user. There is no way to return to a previous diagnostic conversation or to distinguish one session from another.

This creates two friction points:

1. **No resumability** — a support engineer who accidentally clicks "New chat" or closes the tab loses access to a prior diagnostic thread they may need to continue or reference later.
2. **No identity** — multiple open investigations cannot be named or told apart. A user running a "client ACME timeout" investigation has no way to distinguish it from a "sched-42 backlog" investigation when both are stored in the system.

## Users And Impact

- **Support Engineers** — run multiple parallel investigations across different clients or schedules; currently each "New chat" discards the previous thread with no way back.
- **SREs on-call** — may start a session, attend to another alert, and want to return to the original diagnostic thread later in the same shift.
- **Team Leads / Auditors** — want to browse past sessions by name to review what the assistant recommended during a specific incident.

## Desired Outcome

- Users can see a list of their past chat sessions in the UI, each identified by a name.
- Users can name a session when creating it, or rename it later; if no name is given, the system auto-names it from the first message or a timestamp.
- Users can switch to a past session and continue the conversation where they left off.
- The current session remains visible and editable.
- Session list is scoped to the authenticated user — other users' sessions are not visible.

## Example Scenarios

- **Scenario 1:** Engineer opens the admin portal, types "New chat", enters name "ACME timeout — 2026-04-03", asks follow-up questions. The next day they open the portal, see "ACME timeout — 2026-04-03" in the sidebar, click it, and continue the thread.
- **Scenario 2:** Engineer is mid-session when a second alert fires. They click "New chat", name it "Urgent: sched-42 backlog", investigate, then return to the sidebar and switch back to the original session without losing either thread.
- **Scenario 3:** A team lead opens the portal, browses the session list, and reads a completed diagnostic thread for audit purposes (read-only view of past session).

## Priority And Timing

- Deferred from FEAT-ASSISTANT-003 (explicitly listed as out of scope).
- Priority: medium — FEAT-ASSISTANT-003 must be in production first.
- No hard deadline; schedule for the sprint after FEAT-ASSISTANT-003 is validated.
