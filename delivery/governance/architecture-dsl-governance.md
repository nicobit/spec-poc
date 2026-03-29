# Architecture DSL Governance

This repository supports a lightweight structured architecture source using Structurizr DSL.

## Goal

Keep architecture views durable, structured, and maintainable without forcing every feature into a large architecture exercise.

The recommended approach is:

- one logical Structurizr workspace for the repository
- modular DSL fragments included into that workspace
- short markdown architecture documents that explain interpretation, scope, and practical notes

## Recommended Operating Model

Use Structurizr DSL as the structured architecture source for:

- software system
- container
- component
- dynamic
- deployment views

Do not create multiple unrelated standalone workspaces for the same repository unless there is a very strong reason.

The preferred default is:

- one master workspace
- multiple included files

## Recommended Folder Structure

```text
specs/architecture/
  structurizr/
    workspace.dsl
    model/
      people.dsl
      software-systems.dsl
      containers.dsl
      components.dsl
    views/
      system-context.dsl
      container-views.dsl
      component-views.dsl
      dynamic-views.dsl
      deployment-views.dsl
    styles/
      styles.dsl
```

This structure keeps one coherent model while allowing small targeted updates.

## Master Workspace Rule

The master workspace file should be the single entry point for the repository architecture model.

Typical responsibilities:

- define the workspace
- include model fragments
- include view fragments
- include styles

The master workspace should stay small and orchestration-focused.

## Include Strategy

Use `!include` to keep the workspace modular.

Preferred split:

- `model/` for structural elements and relationships
- `views/` for the actual diagrams and view definitions
- `styles/` for shared styling rules

This is preferred over:

- one monolithic DSL file that becomes hard to update
- many independent workspaces that drift apart

## Markdown Versus DSL Responsibilities

Use Structurizr DSL for:

- structured architecture model elements
- relationships
- named views
- deployment topology views
- dynamic interaction views

Use markdown documents in `specs/architecture/` for:

- concise interpretation
- practical scope notes
- current-state caveats
- modeling limitations
- human-readable summaries for reviewers who do not need the full DSL

Recommended rule:

- DSL is the structured architecture source
- markdown explains the architecture in plain language

The two should complement each other, not duplicate every detail.

## Update Triggers

Update the Structurizr DSL when a feature materially changes:

- system boundaries
- major containers
- important components
- important deployment topology
- important cross-container interactions

Update markdown architecture views when:

- interpretation or current-state notes change
- the repository needs a quick human-readable summary
- the structured view alone is not enough for the intended audience

## Ownership

The Solution Architect role should own the decision about whether a feature requires:

- DSL updates
- markdown architecture updates
- both
- or an ADR in addition

Typical guidance:

- use DSL to keep durable structure current
- use markdown to keep explanation accessible
- use ADRs for significant trade-offs or long-lived decisions

## Lightweight Practice

- keep one workspace, not many unrelated ones
- split by `!include` so updates stay small
- avoid modeling code-level detail
- update only the affected fragments
- prefer a stable naming scheme so views remain readable over time

## Expected Benefit

This model keeps architecture practical:

- structured enough to support consistent views
- modular enough to avoid one giant file
- lightweight enough for feature-driven updates
- readable enough for humans and usable by AI
