# Architecture Specs

Store durable architecture artifacts here.

This area exists to keep system design visible without turning every feature into a heavy architecture exercise.

## Purpose

Use `specs/architecture/` for living reference views that explain:

- what the system is
- how it is decomposed
- how important parts interact
- how it is deployed
- how important data is structured

These artifacts should be updated only when a feature materially changes the architecture they describe.

## Recommended Lightweight Set

Start with the smallest useful set:

- `system-context.md`
- `container-view.md`
- `component-view.md`
- `deployment-view.md`
- `data-model.md`

Optional additions:

- `dynamic-views/` for important workflows only
- domain-specific component views when one global component view becomes too broad
- integration notes when an external boundary is operationally important

## Guidance

- Prefer a few maintained views over many stale diagrams.
- Keep the views focused on architecture, not file-level code structure.
- Prefer markdown-first views that are cheap to read and update.
- Update the smallest affected architecture artifact instead of creating feature-local duplicates.
- Use ADRs only for significant decisions; use architecture views for durable system understanding.

Architecture governance and DSL conventions live under `delivery/governance/`.

## Current Baseline Views

- `system-context.md`
- `container-view.md`
- `deployment-view.md`
- `data-model.md`

## Structured Architecture Source

When the repository maintains a structured architecture model, the preferred approach is:

- one Structurizr DSL workspace
- modular `!include` files for model, views, and styles
- markdown architecture documents kept as concise explanatory companions

See `delivery/governance/architecture-dsl-governance.md` for the default convention.

Current baseline workspace:

- `structurizr/workspace.dsl`
