# Claude Command: Backend Runtime Review

Use this command when the request touches backend runtime structure, route auth, or Azure Functions versus ASGI compatibility.

Read:

- `backend/README.md`
- `backend/runtimes/asgi/README.md`
- `backend/shared/README.md`
- `backend/function_health/README.md`

Then:

1. identify whether the change belongs in shared code or a runtime adapter
2. preserve Azure Functions and ASGI compatibility
3. preserve the auth policy where only `GET /health/healthz` is public
4. call out any required backend test updates
