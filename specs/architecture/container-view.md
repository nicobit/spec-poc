# Container View

## Purpose

Describe the main runtime containers and persistent services in the current `admin-portal` system.

This is a lightweight C4-style container view. It explains major deployable units and storage boundaries. It is not a file-level implementation map.

## Scope

Current repository state as of the present spec-driven framework update.

## Primary Actors

- Admin user
- Environment manager
- Authorized schedule recipient
- External Azure platform services

## Main Containers

### 1. Frontend Web Application

- Location: `frontend/`
- Technology: React + TypeScript + Vite
- Responsibility:
  - authenticated admin UI
  - route-driven management screens
  - environment create, edit, details, manage, and schedules flows
  - calls backend HTTP APIs

### 2. Backend HTTP API Surface

- Location: `backend/function_*` HTTP-oriented entrypoints, especially `backend/function_environment`
- Technology: Azure Functions-hosted adapters with FastAPI app surfaces
- Responsibility:
  - environment CRUD
  - stage lifecycle control
  - schedule CRUD
  - postponement handling
  - audit and activity retrieval
  - authn/authz enforcement at the application layer

Notes:

- Azure Functions `authLevel` remains anonymous at the platform layer by design.
- Application-level authentication protects backend routes except `GET /health/healthz`.

### 3. Backend Shared Domain And Storage Layer

- Location: `backend/shared/`
- Technology: Python shared modules
- Responsibility:
  - environment and schedule models
  - environment repository and storage selection
  - schedule persistence integration
  - audit persistence helpers
  - shared authentication and configuration helpers

This layer is intended to remain more portable than the hosting adapters.

### 4. Azure Functions Timer Trigger

- Location: `backend/function_scheduler_timer`
- Responsibility:
  - poll due schedules
  - enqueue work items for execution

### 5. Azure Functions Queue Worker

- Location: `backend/function_scheduler_worker`
- Responsibility:
  - consume queued schedule executions
  - call the environment API to perform start or stop actions
  - record audit events

### 6. ASGI Runtime Shell

- Location: `backend/runtimes/asgi/app.py`
- Technology: FastAPI aggregation shell
- Responsibility:
  - host selected backend apps outside Azure Functions
  - support container, App Service, Azure Container Apps, or AKS-style runtime options

Current note:

- The ASGI runtime is an important hosting direction for the backend, but not every function surface is yet mounted there.

## Persistent And External Services

### Microsoft Entra ID

- Used for identity and application-level authorization context.

### Azure Table Storage

Current uses:

- environment persistence when table-backed environment storage is selected
- audit persistence
- other feature-specific backend storage outside the Environments domain

### Azure Cosmos DB

Current uses:

- schedule persistence
- optional environment persistence when Cosmos-backed environment storage is selected

### Azure Queue Storage

Current use:

- `env-schedule-queue` for schedule execution handoff between timer and worker functions

### JSON File Fallbacks

Current local or dev-friendly fallbacks:

- environment audit events can fall back to `backend/shared/audit_log.json`
- environments and schedules can use in-memory stores for local development and tests

## Container Relationships

### User-Driven Environment Management

1. User interacts with the frontend web application.
2. Frontend calls backend environment endpoints.
3. Backend HTTP adapters delegate to shared models and repository helpers.
4. Environment data is persisted in:
   - Azure Table Storage by default when configured
   - Azure Cosmos DB when explicitly selected
   - in-memory store in local or test-only scenarios
5. Audit events are written to Azure Table Storage or JSON fallback.

### Schedule Execution Path

1. User configures schedules through the frontend.
2. Frontend calls backend schedule endpoints.
3. Schedule data is persisted in Cosmos DB when configured, otherwise in-memory for local or test scenarios.
4. Scheduler timer finds due schedules and enqueues work on `env-schedule-queue`.
5. Scheduler worker consumes queue messages and calls the environment API to perform the action.
6. Audit events are recorded for execution, notification, and postponement activity.

## Current Architectural Observations

- The frontend is already feature-sliced and thin at the route layer.
- The backend is in transition from Azure Functions-first adapters toward a more portable shared and ASGI-capable structure.
- Environment persistence and schedule persistence currently use different backing paths.
- Audit persistence is separate from environment and schedule persistence.
- The system already benefits from durable architecture views because runtime topology and storage responsibilities are not obvious from feature specs alone.

## Current Containers Summary

| Container | Main Responsibility | Current Technology |
| --- | --- | --- |
| Frontend web app | User-facing admin portal UI | React, TypeScript, Vite |
| Backend HTTP API | CRUD, lifecycle, scheduling, postponement APIs | Azure Functions adapters with FastAPI surfaces |
| Shared backend layer | Domain models, repositories, shared auth/config | Python shared modules |
| Scheduler timer | Enqueue due schedules | Azure Functions timer trigger |
| Scheduler worker | Process queued schedule actions | Azure Functions queue trigger |
| ASGI runtime shell | Alternative unified backend hosting surface | FastAPI |
| Table storage | Environment and audit persistence | Azure Table Storage |
| Cosmos DB | Schedule persistence and optional environment persistence | Azure Cosmos DB |
| Queue storage | Schedule execution handoff | Azure Queue Storage |

## Follow-Up Candidates

- Add a `system-context.md` baseline so external users and platforms are documented explicitly.
- Add a `deployment-view.md` baseline for Azure Functions, ASGI container hosting, storage, and identity relationships.
- Add dynamic views for:
  - environment lifecycle action execution
  - schedule execution and postponement
