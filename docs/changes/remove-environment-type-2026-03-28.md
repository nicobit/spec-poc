# Removal of `Environment.type` and derivation guidance

Date: 2026-03-28

## Summary

The `Environment.type` top-level field has been removed from the canonical backend model and API contract. The logical environment type should be derived from per-stage resource actions stored in `stages[].resourceActions[].type`.

This document explains the reasoning, the server-side compatibility behavior, and client migration guidance.

## Why this change

- The type of resources for an environment is a stage-level concern: different stages may host different resource types.
- Maintaining a separate top-level `Environment.type` produced duplication and risk of data drift.
- Moving to per-stage `resourceActions[].type` simplifies the model and aligns UI/runtime behavior.

## Server compatibility behavior

- The server validates incoming `POST` / `PUT` payloads against the canonical `EnvironmentModel` (which no longer defines `type`). Any supplied top-level `type` should be removed by clients.
- For convenience and backward-compatibility only when returning details for a single environment, the server may attach a derived `type` to the GET `/api/environments/{id}` response. This is a convenience only and not part of the create/update contract.

Derivation heuristic used by the server (implemented in `backend/function_environment/__init__.py` as `_derive_type_from_stages`):

- Collect all non-empty `resourceActions[].type` values across all stages.
- If no types found -> return `null` (no derived type).
- If exactly one unique type found -> return that type (e.g., `aws-ec2`).
- If multiple types found but they all share a common prefix before the first `-` (e.g., `gcp-k8s`, `gcp-sql`) -> return that prefix (e.g., `gcp`).
- Otherwise return the literal string `mixed`.

Note: The server-side derived value is intended for display convenience only. Clients that need deterministic logic should implement the same derivation locally.

## Examples

Given stages:

- stage A: resourceActions: [{ type: `aws-ec2` }]
- stage B: resourceActions: [{ type: `aws-ec2` }]

Derived type: `aws-ec2`

Given stages:

- stage A: resourceActions: [{ type: `gcp-k8s` }]
- stage B: resourceActions: [{ type: `gcp-sql` }]

Derived type: `gcp`

Given stages:

- stage A: resourceActions: [{ type: `aws-ec2` }]
- stage B: resourceActions: [{ type: `gcp-sql` }]

Derived type: `mixed`

## Migration guidance for clients

- Stop sending `type` in requests to `POST /api/environments` and `PUT /api/environments/{id}`.
- When rendering an environment list or details, derive the logical environment type from `stages[].resourceActions[].type` using the heuristic above if you need to display a single type.
- Update fixtures and tests to remove top-level `type` from environment objects.

## Tests and verification

- Backend unit tests were added for the derivation helper (`tests/backend/test_derive_type.py`).
- Update frontend tests to stop asserting on top-level `type`; use per-stage `resourceActions` in fixtures where relevant. Frontend tests in this repo were updated accordingly.

## Notes

- If future product requirements demand a canonical environment-level type, revisit and document a persistent canonicalization step that reconciles stage resource types and becomes part of the create/update contract.

---

File: `docs/changes/remove-environment-type-2026-03-28.md`