Function: Scheduler Timer (enqueues due schedules)

Location: `backend/function_scheduler_timer`

Purpose
- Runs on a schedule (configured to every minute in development) and enqueues due schedule items to `env-schedule-queue`.

Quick test (local, without Functions host)

1. Ensure the Environment API is running locally (see `backend/function_environment/README.md`).
2. Run the scheduler simulator (this bypasses Azure Functions but exercises the same logic):

```bash
python scripts/run_scheduler_simulator.py
```

3. Check `backend/shared/audit_log.json` for execution/audit entries.

Azure Functions local
- To run the actual function locally you can use Azure Functions Core Tools and ensure `AzureWebJobsStorage` is configured for queue binding.
