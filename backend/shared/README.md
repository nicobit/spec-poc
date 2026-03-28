# Backend Shared Surface

`backend/shared/` is the runtime-agnostic import surface for common backend code.

Current intent:

- `shared/auth`
- `shared/config`
- `shared/services`
- `shared/utils`
- `shared/context`

This is an incremental migration layer. Existing implementations still live under `backend/app/`, but new runtime-facing imports should prefer `shared/...` so the backend can keep moving toward a clearer separation between:

- shared/domain code
- runtime adapters
- future deployment targets beyond Azure Functions

