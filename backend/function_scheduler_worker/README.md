Function: Scheduler Worker (queue processor)

Location: `backend/function_scheduler_worker`

Purpose
- Consumes messages from `env-schedule-queue` and calls the Environment API to perform start/stop actions, recording audit logs.

Quick test (local)

1. Start the Environment API locally (see `backend/function_environment/README.md`).
2. Use the scheduler simulator to enqueue and process schedules:

```bash
python scripts/run_scheduler_simulator.py
```

3. Alternatively, if you want to directly test the worker, place a JSON message into the queue (requires Azure Storage account) or adapt `scripts/run_scheduler_simulator.py` to POST directly to the worker endpoint.
