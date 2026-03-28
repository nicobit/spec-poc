Function: Environment API (mock + schedules)

Location: `backend/function_environment`

Purpose
- Serves environment list and control endpoints and schedule CRUD endpoints used by the Environments UI.

Quick test (local)

1. Install backend dependencies:

```bash
pip install -r backend/requirements.txt
```

2. Start the FastAPI app (serves under `/api/environments`):

```bash
python -m uvicorn backend.function_environment.__init__:fast_app --port 7071
```

3. Create a schedule (requires Authorization header if running real auth; local mocks accept no auth but RBAC will decode JWT if provided):

```bash
curl -X POST http://localhost:7071/api/environments/schedules -H "Content-Type: application/json" -d '{"environment":"DEV","client":"client-x","stage":"stage1","action":"start","cron":"*/1 * * * *","timezone":"UTC"}'
```

4. List schedules:

```bash
curl http://localhost:7071/api/environments/schedules
```

Notes
- Endpoints require an Authorization Bearer token for RBAC enforcement in non-local scenarios. For development you can omit the header and the in-memory store will be used.
- The function imports `get_current_user` which decodes the JWT payload; provide a JWT if you want an owner recorded.
