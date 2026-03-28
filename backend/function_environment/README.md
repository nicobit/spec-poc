**Local run instructions for Environments scheduler (dev only)**

Prerequisites
- Python 3.10+
- Install backend dependencies (in a virtualenv) with:

```bash
pip install -r backend/requirements.txt
```

Run the mock Environment API locally (serves the endpoints under `/api/environments`):

```bash
python -m uvicorn backend.function_environment.__init__:fast_app --port 7071 --host 127.0.0.1
```

In another shell, run the scheduler simulator which will call the API for due schedules:

```bash
python scripts/run_scheduler_simulator.py
```

Check audit log at `backend/shared/audit_log.json` for recorded events.

Cosmos DB (optional)
--------------------
To persist schedules in Cosmos DB instead of the in-memory store set the following environment variable and restart services:

```bash
export COSMOS_CONNECTION_STRING="<your-cosmos-connection-string>"
export COSMOS_DB_NAME="adminportal" # optional
export COSMOS_CONTAINER_NAME="schedules" # optional
```

The timer function will automatically use Cosmos DB when `COSMOS_CONNECTION_STRING` is set. The container will be created if it does not exist.

Notes:
- Use an IANA timezone string when creating schedules and ensure `next_run` is computed server-side.
- For production use, prefer `azure-cosmos` client on a dedicated service principal and consider throughput/cost implications.

Schedule model
--------------
Schedules are defined for a combination of `environment`, `client`, and `stage`. Example JSON for schedule creation:

```json
{
	"environment": "DEV",
	"client": "client-x",
	"stage": "stage1",
	"action": "start",
	"cron": "0 30 2 * * *",
	"timezone": "Europe/London"
}
```


Per-function test READMEs
-------------------------
For convenience each function folder contains a brief README with local testing instructions:

- `backend/function_environment/README.md`
- `backend/function_scheduler_timer/README.md`
- `backend/function_scheduler_worker/README.md`

Start with `backend/function_environment/README.md` to run the API and create schedules, then use the simulator or Functions Core Tools to exercise the timer and worker.

Run functions locally (quick)
---------------------------
We provide helpers in `scripts/` to start the Functions host locally if you have Azure Functions Core Tools installed.

Linux/macOS:

```bash
scripts/run_functions_local.sh
```

Windows (PowerShell):

```powershell
.\scripts\run_functions_local.ps1
```

These helpers will prompt you to set `AzureWebJobsStorage` (required for queue bindings) and optional `COSMOS_CONNECTION_STRING`.

Notes
- This is a local developer scaffold. In production, use Azure Timer + Queue triggers and a persistent store for schedules.
- The simulator updates `next_run` naively (+1 hour). Replace with proper cron evaluation (e.g., `croniter`) for real schedules.
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
