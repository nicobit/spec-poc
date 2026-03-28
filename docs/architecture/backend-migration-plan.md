# Backend Migration Plan

This plan maps the current backend layout to a cleaner long-term structure without forcing a disruptive rewrite.

## Current Backend Snapshot

Current high-level folders:

- `backend/app`
- `backend/function_costs`
- `backend/function_dashboard`
- `backend/function_diagrams`
- `backend/function_health`
- `backend/function_llm_proxy`
- `backend/function_queryexamples`
- `backend/function_texttosql`
- `backend/prompts`

This reflects a Functions-first layout, which is reasonable for the current stage of the repo.

## Target Direction

The backend should move gradually toward runtime separation plus shared logic:

```text
backend/
  shared/
  contracts/
  runtimes/
    azure-functions/
  tests/
  deployment/
```

## Recommended Migration Stages

## Stage 1: Document The Boundary

Do now, with minimal disruption:

- treat existing `function_*` folders as Azure Functions runtime adapters
- treat `backend/app` as an early shared area if it already contains reusable logic
- treat `backend/prompts` as shared prompt assets until a clearer long-term home is chosen

Recommended documentation rule:

- new reusable backend logic should prefer a shared area rather than being embedded directly into a specific function folder when practical

## Stage 2: Introduce Neutral Folders

Add these folders before moving major code:

- `backend/shared/`
- `backend/contracts/`
- `backend/deployment/`
- `backend/tests/`

Use them for new work first.

This allows the repo to evolve without an immediate large move.

## Stage 3: Stop Growing Runtime-Coupled Logic

For new backend features:

- put domain or reusable logic in `backend/shared/`
- put schemas and contracts in `backend/contracts/`
- keep function entry points thin inside the runtime-specific folders

At this stage, existing `function_*` folders can remain where they are.

## Stage 4: Rename Runtime Area

When the repository is ready for a structural cleanup, move:

- `backend/function_*` folders into `backend/runtimes/azure-functions/`

Possible target shape:

```text
backend/
  runtimes/
    azure-functions/
      costs/
      dashboard/
      diagrams/
      health/
      llm-proxy/
      query-examples/
      text-to-sql/
```

This move is best done when:

- active feature work is low
- CI can validate the move
- import paths and deployment automation are understood

## Stage 5: Add Additional Runtimes If Needed

Only after a second runtime really exists, add:

- `backend/runtimes/containers/`
- or another runtime-specific folder

Do not create empty runtime structures too early unless it helps delivery clarity.

## Suggested Mapping From Current Layout

### Likely Runtime-Specific

- `backend/function_costs` -> `backend/runtimes/azure-functions/costs`
- `backend/function_dashboard` -> `backend/runtimes/azure-functions/dashboard`
- `backend/function_diagrams` -> `backend/runtimes/azure-functions/diagrams`
- `backend/function_health` -> `backend/runtimes/azure-functions/health`
- `backend/function_llm_proxy` -> `backend/runtimes/azure-functions/llm-proxy`
- `backend/function_queryexamples` -> `backend/runtimes/azure-functions/query-examples`
- `backend/function_texttosql` -> `backend/runtimes/azure-functions/text-to-sql`

### Likely Shared Or Cross-Cutting

- `backend/app` -> likely candidate for `backend/shared/` after review
- `backend/prompts` -> shared prompt assets; keep for now or later move under a dedicated shared asset folder

### Likely Deployment Or Root-Level Support

- `backend/host.json`
- `backend/requirements.txt`
- `backend/local.settings.reference.json`

These may remain at the backend root while Azure Functions is the active runtime, or be revisited during the larger runtime reorganization.

## Recommended Rule For Now

Do not do a large physical move yet unless there is a strong delivery reason.

Instead:

1. use the target structure as the architectural direction
2. place new shared logic into neutral folders
3. keep current function folders stable until a planned refactor
4. move the runtime folders only when validation and deployment impact are understood
