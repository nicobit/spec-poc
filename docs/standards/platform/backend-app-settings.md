# Backend App Settings

This document lists the main backend runtime settings expected by the current codebase.

Example values:

- [backend/deployment/appservice/appsettings.example.json](../../backend/deployment/appservice/appsettings.example.json)

## Identity

- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID`
- `AUDIENCE`

## Key Vault

- `KEY_VAULT_CORE_URI`
- `KEY_VAULT_URI`

## OpenAI / LLM

- `AZURE_OPENAI_KEY_SECRET_NAME`
- `AZURE_OPENAI_ENDPOINT_SECRET_NAME`
- `AZURE_OPENAI_VERSION_SECRET_NAME`
- `EMBEDDING_MODEL`
- `COMPLETION_MODEL`

## Search

- `AZURE_SEARCH_INDEX_NAME`
- `AZURE_SEARCH_SERVICE_ENDPOINT_SECRET_NAME`
- `AZURE_SEARCH_API_KEY_SECRET_NAME`
- `MEMORY_SEARCH_INDEX_NAME`
- `MEMORY_SEARCH_SERVICE_ENDPOINT_SECRET_NAME`
- `MEMORY_SEARCH_API_KEY_SECRET_NAME`

## Database / Storage

- `BLOB_STORAGE_CONNECTION_STRING_SECRET_NAME`
- `SQL_CONNECTION_STRING_SECRET_NAME`
- `DATABASE_DNS_SECRET_NAME`
- `USERNAME_SECRET_NAME`
- `PASSWORD_SECRET_NAME`
- `DATABASE_NAME`
- `STORAGE_ACCOUNT_NAME`
- `USAGE_TABLE_NAME`
- `AUDIT_BLOB_CONTAINER`

## Backend Behavior

- `DASHBOARD_TABLE_NAME`
- `DASHBOARD_PROXY_ALLOWED_HOSTS`
- `DASHBOARD_PROXY_CACHE_TTL_SECONDS`
- `CORS_ALLOWED_ORIGINS`
- `DEFAULT_DAILY_QUOTA`
- `ENFORCE_QUOTA`
- `ROWS_LIMIT`

## Chat Sessions

- `COSMOS_CONNECTION_STRING` — connection string for the Cosmos DB account; omit to use the in-memory fallback
- `COSMOS_CHAT_CONTAINER_NAME` — Cosmos container name for chat sessions (default: `chatsessions`)
- `CHAT_HISTORY_TOKEN_BUDGET` — max estimated tokens of prior turns injected per request (default: `3000`)
- `CHAT_SUMMARIZE_THRESHOLD` — number of unsummarized turns that triggers rolling summarization (default: `6`)
- `CHAT_SESSION_TTL_DAYS` — session document TTL in days (default: `7`)

## Observability

- `APPLICATIONINSIGHTS_CONNECTION_STRING`

## Notes

- Many values are secret names, not the secrets themselves.
- The preferred production model is to store sensitive values in Key Vault and expose only the necessary Key Vault URI and secret names through app settings.
- The example file is not a production configuration; it is an inventory/template.
