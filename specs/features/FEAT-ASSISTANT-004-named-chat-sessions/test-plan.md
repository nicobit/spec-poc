# Test Plan — FEAT-ASSISTANT-004 — Named Chat Sessions

- Feature ID: FEAT-ASSISTANT-004
- Purpose: Validate session listing, loading, renaming, deletion, and UI behavior.

Planned tests:
- Backend: `list_sessions`, `get_session`, `rename_session`, `delete_session` (unit + HTTP)
- Frontend: SessionSidebar render, loadSession, rename, delete flows
- Integration: end-to-end flow from creating a named session to switching to it

