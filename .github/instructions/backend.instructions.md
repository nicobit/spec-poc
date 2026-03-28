---
applyTo: "backend/**/*.py"
---

When editing backend Python code:

- preserve API and data contract correctness
- keep domain logic separate from Azure Functions or other runtime adapters where practical
- prefer `backend/shared/...` as the stable shared import surface when possible
- keep Azure Functions wrappers thin and preserve compatibility with `backend/runtimes/asgi/app.py`
- keep application-level auth on every backend route except `GET /health/healthz`
- update authorization documentation when route exposure, roles, or access behavior changes
- do not change Azure Functions `authLevel` from `anonymous` unless repository policy changes
- prefer lazy initialization for secrets, SDK clients, telemetry, and network dependencies
- validate inputs, error paths, and edge cases described in the specs
- add or update tests that cover acceptance criteria and regression risk
- avoid hard-coding runtime assumptions that make future hosting portability harder
