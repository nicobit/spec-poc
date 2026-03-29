# Architecture Governance

This repository uses a lightweight architecture layer alongside feature-level specifications.

## Goal

Keep architecture visible and current without requiring every feature to produce a full design pack.

The architecture layer should answer a small set of durable questions:

- what is inside the system boundary
- what the main containers are
- how major components are divided
- how the system is deployed
- how important data is structured
- how a few important workflows move through the system

## Default Architecture Views

The default durable views are:

1. `system-context.md`
2. `container-view.md`
3. `component-view.md`
4. `deployment-view.md`
5. `data-model.md`

Optional:

- `dynamic-views/`

When the repository adopts a structured architecture source, these views may also be represented in Structurizr DSL under `specs/architecture/structurizr/`, with markdown views remaining as lightweight explanatory companions.

## What Each View Should Cover

### System Context

Use for:

- main users or external actors
- system boundary
- major external systems and dependencies

### Container View

Use for:

- major deployable or runtime units
- major data stores
- main integration boundaries

### Component View

Use for:

- major domain components inside an important container
- responsibilities and boundaries
- important interactions

This is not a code-level decomposition.

### Deployment View

Use for:

- hosting model
- runtime topology
- infrastructure relationships
- operational boundaries

### Data Model

Use for:

- main entities or records
- ownership and source of truth
- key identifiers
- important relationships
- important lifecycle or status fields
- storage location where relevant

This should stay lightweight unless the domain complexity requires deeper modeling.

### Dynamic Views

Use only for important workflows that benefit from interaction sequencing, for example:

- authentication and authorization
- environment orchestration
- schedule execution
- notification dispatch

Do not create dynamic views for every feature by default.

## Update Triggers

Update architecture views when a feature materially changes:

- system boundaries
- container responsibilities
- component ownership
- deployment topology
- important workflow sequencing
- important data structure or ownership

If none of these change materially, the feature may reference existing architecture views without updating them.

## Role Expectations

The Solution Architect role should decide whether a feature requires:

- architecture notes only
- architecture view updates
- an ADR
- both architecture view updates and an ADR

Typical rule of thumb:

- use architecture views for durable system understanding
- use Structurizr DSL when a structured cross-view architecture source is useful
- use ADRs for significant choices and trade-offs

## Lightweight Practice

- Keep the number of architecture documents small.
- Prefer editing existing views over creating new ones.
- Keep diagrams or markdown views easy to maintain.
- Prefer one modular Structurizr workspace over multiple unrelated architecture DSL workspaces when using a DSL.
- Avoid making architecture documentation a mandatory heavy artifact for low-risk changes.
- Treat `data-model.md` as a high-value default artifact when the repository lacks a clear shared data structure reference.

## Expected Benefit

This approach keeps the framework practical:

- business and feature specs remain the source of truth for requested behavior
- architecture stays visible across features
- teams can understand systems, containers, components, deployment, and data structure without reverse-engineering the codebase
