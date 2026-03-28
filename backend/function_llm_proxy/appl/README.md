# LLM Proxy Application

This folder contains the FastAPI application behind the backend LLM proxy.

Primary app factory:

- `backend/function_llm_proxy/appl/fastapi_app.py`

Azure Functions wrapper:

- `backend/function_llm_proxy/__init__.py`

The same FastAPI surface is also loaded by the ASGI runtime.

## What It Provides

- authenticated health check for the proxy feature
- per-user usage reporting
- per-user quota updates
- Azure OpenAI-compatible chat completions forwarding
- Azure OpenAI-compatible embeddings forwarding
- an OpenAI-style compatibility alias for chat completions

## Current Endpoints

Authenticated:

- `GET /llm/healthz`
- `GET /llm/usage/today`
- `GET /llm/usage/range`
- `PUT /llm/quota/{target_user_id}`
- `POST /llm/openai/deployments/{deployment}/chat/completions`
- `POST /llm/openai/deployments/{deployment}/embeddings`
- `POST /llm/v1/chat/completions`

## Important Current Behavior

- All routes in this app require bearer-token authentication.
- `PUT /llm/quota/{target_user_id}` is authenticated, but it is not currently restricted to admins only.
- Usage is stored through the repository layer under `backend/function_llm_proxy/appl/repos`.
- Settings are loaded lazily through `backend/function_llm_proxy/appl/config.py`.

## Configuration

This app depends on:

- Entra ID / JWT validation inputs
- Azure OpenAI endpoint and key material
- storage account configuration for usage tracking
- quota-related settings such as `DEFAULT_DAILY_QUOTA` and `ENFORCE_QUOTA`

Most sensitive values are expected to come from Key Vault through the shared settings and secret services rather than being hard-coded in local config.

## Files Worth Starting With

- `backend/function_llm_proxy/appl/fastapi_app.py`
- `backend/function_llm_proxy/appl/config.py`
- `backend/function_llm_proxy/appl/services/openai_client.py`
- `backend/function_llm_proxy/appl/services/usage_service.py`
- `backend/function_llm_proxy/appl/repos/azure_table_repository.py`

## Notes

- Older documentation in this folder claimed there was no chat endpoint; that is no longer true.
- This README now reflects the current route surface instead of the earlier imported sample project state.
