# Azure Functions Runtime

This folder marks the target runtime-oriented structure for Azure Functions.

The current production entrypoints still live in the legacy top-level folders:

- `function_costs`
- `function_dashboard`
- `function_diagrams`
- `function_health`
- `function_llm_proxy`
- `function_queryexamples`
- `function_texttosql`

During the migration, those folders remain the active Azure Functions entrypoints. New shared imports should point to `backend/shared/` instead of reaching directly into legacy shared modules.

The long-term goal is:

- `backend/shared/` for runtime-agnostic code
- `backend/runtimes/azure-functions/` for thin Azure Functions adapters

