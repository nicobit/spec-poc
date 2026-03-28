# Canonical Agent Model

This document defines the canonical agent set for the spec-driven autonomous delivery framework.

The goal is to separate:

- role responsibility
- orchestration responsibility
- review and closure gates
- technology specialization

## Design Principle

Roles explain responsibilities.

Agents explain how an autonomous system should package those responsibilities into reusable workers.

Not every role needs to become a top-level platform agent in every tool. The framework should keep the canonical set small and predictable.

## Canonical Agent Categories

### Core Agents

These agents form the minimum autonomous delivery path for most feature work.

1. `Feature Orchestrator`
   - owns feature state, sequencing, handoffs, and closure checks
   - starts from a governing feature package when one exists
   - decides which additional agents are active
2. `Business Analyst`
   - turns a raw request into a feature-ready specification package
3. `Solution Architect`
   - defines boundaries, contract implications, ADR needs, and portability-aware design choices
4. `Test Manager`
   - converts acceptance criteria into test strategy and validation scope
5. `Frontend Engineer`
   - owns approved frontend implementation
6. `Backend Engineer`
   - owns approved backend implementation
7. `DevOps Engineer`
   - owns CI/CD, deployment, and operational delivery changes when relevant

### Gate And Review Agents

These agents activate when the feature characteristics require an explicit review or closure gate.

1. `UX Expert`
   - required when user journeys, interaction design, or accessibility concerns are material
2. `Automation Tester`
   - required when automated coverage needs to be added or materially changed
3. `Security Reviewer`
   - required when auth, authorization, secrets, or exposure risk changes
4. `Documentation Owner`
   - required when repo, contributor, operational, or user-facing documentation changes
5. `QA Reviewer`
   - required when an independent closure review is needed

### Technology Specializations

These agents are framework-approved specializations of the core implementation agents.

1. `ReactJS Expert`
   - specialization of `Frontend Engineer`
2. `Python Engineer`
   - specialization of `Backend Engineer`

Framework rule:

- prefer core agent names in canonical orchestration logic
- use technology-specialized agent names only in platform adapters or when the implementation surface is explicitly tied to that technology

## Canonical Mapping

| Canonical Agent | Category | Maps To Roles |
| --- | --- | --- |
| `Feature Orchestrator` | core | orchestration across roles |
| `Business Analyst` | core | `Business Analyst` |
| `Solution Architect` | core | `Solution Architect` |
| `Test Manager` | core | `Test Manager` |
| `Frontend Engineer` | core | `ReactJS Expert` or another approved frontend specialization |
| `Backend Engineer` | core | `Backend Engineer`, `Python Engineer`, or another approved backend specialization |
| `DevOps Engineer` | core | `DevOps Engineer` |
| `UX Expert` | gate/review | `UX Expert` |
| `Automation Tester` | gate/review | `Automation Tester` |
| `Security Reviewer` | gate/review | `Security Reviewer` |
| `Documentation Owner` | gate/review | `Documentation Owner` |
| `QA Reviewer` | gate/review | `QA Reviewer` |

## Framework Expectations

Platform-specific agent systems should align to this model as follows:

- every platform should support the core agent set, either directly or through explicit fallback rules
- platform adapters may omit a gate or specialization agent only if the omission is documented and the responsibility is reassigned explicitly
- the orchestrator behavior should be canonical even if the platform does not support an actual orchestrator primitive

## Current Platform Status

### GitHub

- strongest current alignment
- has an explicit `Feature Orchestrator`
- has most gate and review agents represented directly
- still uses technology-specialized names such as `ReactJS Expert` and `Python Engineer`

### Claude

- partial alignment
- currently has a reduced agent set plus routing guidance
- does not yet expose the full canonical gate/review set as platform agents

### Codex

- partial alignment
- currently has a reduced agent set plus routing guidance
- does not yet expose the full canonical gate/review set as platform agents

## Recommended Adapter Rule

When implementing platform-specific agents:

1. map each platform agent to a canonical agent in this document
2. keep platform-only behavior minimal
3. avoid inventing new agent identities unless the canonical model is updated first

## Recommended Next Steps

To make the framework more autonomous and consistent:

1. introduce explicit platform mapping docs under `delivery/agents/`
2. add equivalent orchestrator adapters for Claude and Codex
3. decide whether `Frontend Engineer` and `Backend Engineer` should remain canonical agent names while `ReactJS Expert` and `Python Engineer` stay as specializations
