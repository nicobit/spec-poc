---
name: backend-runtime-portability
description: Keep backend Python changes compatible across Azure Functions adapters, shared code, and the ASGI runtime while avoiding runtime-specific coupling.
---

---
name: backend-runtime-portability
description: Keep backend Python changes compatible across Azure Functions adapters, shared code, and the ASGI runtime while avoiding runtime-specific coupling.
---

# Backend Runtime Portability

Use this skill when changing backend Python code that must continue to work across:

- Azure Functions adapters
- the ASGI runtime in `backend/runtimes/asgi/app.py`

## Goals

- keep runtime adapters thin
- prefer `backend/shared/...` for shared imports when practical
- avoid import-time external initialization
- preserve the current auth policy

## Checklist

1. Identify whether the change belongs in shared code or a runtime adapter.
2. Avoid coupling business logic to Azure Functions request or trigger details.
3. Confirm the change does not break ASGI loading.
4. Keep `GET /health/healthz` as the only public backend route unless specs say otherwise.
5. Add or update backend tests when route behavior or runtime loading changes.

## Read First

- `backend/README.md`
- `backend/runtimes/asgi/README.md`
- `backend/shared/README.md`
