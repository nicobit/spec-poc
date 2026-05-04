# Recommended Rollout Plan

Use this sequence when introducing Copilot customization to a team.

## Phase 1: Baseline

Create:

- `.github/copilot-instructions.md`
- `AGENTS.md`

Goal:

- establish core safety, validation, and ownership rules

## Phase 2: Area Guidance

Create only the most justified path-specific instruction files, usually:

- frontend
- backend
- testing
- docs

Goal:

- make technology- and layer-specific expectations explicit

## Phase 3: Repeated Workflows

Add 2 to 4 skills based on what the team actually repeats.

Good defaults:

- repo onboarding
- bug triage
- change safety review
- release check

Goal:

- make recurring tasks easier and more consistent

## Phase 4: Specialist Agents

Add 0 to 2 custom agents only if the team repeatedly benefits from a narrow specialist review.

Good first candidates:

- api contract reviewer
- release readiness checker

Goal:

- support recurring high-value analysis without creating a large agent catalog

## Phase 5: Tightening

After a few real tasks:

- remove unused artifacts
- merge overlapping artifacts
- improve unclear prompts
- normalize structure

Goal:

- keep the setup lean and maintainable
