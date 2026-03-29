# System Context

## Purpose

Describe the `admin-portal` system boundary, its primary users, and its main external dependencies.

This is a lightweight C4-style system context view.

## System Under Consideration

`admin-portal`

An administrative portal and backend platform for managing operational data, environment lifecycle actions, schedule automation, and selected platform-backed admin capabilities.

## Primary Actors

### Admin User

Uses the portal to:

- access administrative features
- manage environments and stages
- configure schedules
- run lifecycle actions
- inspect activity and operational state

### Environment Manager

Uses the portal to:

- manage client-owned environments
- configure stage Azure services
- manage recurring schedules
- inspect activity and lifecycle state

### Authorized Schedule Recipient

Receives schedule notifications and may be allowed to postpone scheduled actions when policy permits.

## External Systems And Services

### Microsoft Entra ID

Role:

- identity provider
- token issuer
- source of authenticated user context for backend authorization

### Azure Table Storage

Role:

- persistence for some backend feature data
- audit storage for environment activity
- environment persistence when table-backed environment storage is selected

### Azure Cosmos DB

Role:

- schedule persistence
- optional environment persistence when Cosmos-backed environment storage is selected

### Azure Queue Storage

Role:

- handoff channel for scheduled execution work between timer and worker processes

### Azure App Service For Containers

Role:

- current preferred deployment target for the backend ASGI runtime

### Azure Functions

Role:

- current production-oriented adapter model for several backend entrypoints
- host for timer and queue trigger execution in the Environments domain

### Key Vault And Related Azure Platform Services

Role:

- secret management
- runtime configuration support
- supporting platform dependencies for the backend

### Application Insights

Role:

- observability target for backend deployment and runtime monitoring

## System Boundary Summary

Inside the `admin-portal` system:

- frontend web application
- backend HTTP APIs
- shared domain and persistence logic
- schedule execution adapters
- environment management workflow
- activity and audit collection

Outside the `admin-portal` system:

- identity provider
- persistent Azure platform services
- external infrastructure or Azure resources controlled by environment lifecycle actions

## Main Interaction Patterns

### Administrative Management

1. Admin or environment manager opens the frontend.
2. Frontend calls backend APIs.
3. Backend authorizes the request and performs environment or schedule operations.
4. Changes are persisted and audit events are recorded.

### Schedule Execution

1. A configured schedule becomes due.
2. Timer processing identifies the due schedule.
3. A queue message is created for execution.
4. Worker processing triggers the environment action path.
5. Audit and activity data are recorded.

### Postponement

1. An authorized notified recipient, admin, or environment manager requests postponement.
2. Backend verifies authorization and postponement policy.
3. The schedule is updated and an audit event is recorded.

## Current Notes

- The repository supports both Azure Functions and ASGI/App Service hosting directions.
- The backend architecture is moving toward a more portable shared-core model while retaining current Functions adapters.
- The Environments domain is a good example of why durable architecture views are useful: feature specs describe required behavior, but the system boundary and external service relationships still need explicit documentation.

