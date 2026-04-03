This page provides a short product-facing summary of the Environments feature.

Environments provide a way to manage per-client deployment stages, scheduling, and lifecycle actions (start/stop) for environment resources. The canonical API surface is implemented under the backend endpoints `/api/environments` and related scheduler functions.

For developer-oriented run and simulator instructions (local dev), see `backend/function_environment/README.md`.

If you are updating or migrating client integrations, see the change notes in `docs/changes/` for recent behavioral changes.

Postponed schedules UI
----------------------

The Environments Dashboard now surfaces manually postponed schedules in a "Postponed schedules" subsection so operators can quickly see deferred start/stop actions, who postponed them, and the reason. See the governing dashboard feature spec: `specs/features/FEAT-ENVIRONMENTS-002-dashboard/feature-spec.md`.
