# Copilot Artifact Decision Guide

Use this guide to decide which Copilot customization artifact to create or update.

The goal is to avoid duplication, overengineering, and unclear ownership.

## Quick Decision Rules

If the question is:

- "What rules apply almost everywhere in this repo?"
  Use `.github/copilot-instructions.md`

- "What conventions apply only in one technology area, folder, or layer?"
  Use `.github/instructions/*.instructions.md`

- "How do we repeatedly perform a recurring workflow?"
  Use `.github/skills/<skill-name>/SKILL.md`

- "Who owns this area and who should be involved when a change crosses boundaries?"
  Use `AGENTS.md`

- "Do we need a specialist Copilot agent for a recurring high-value review or analysis task?"
  Use `.github/agents/<agent-name>.agent.md`

## By Intent

### Use `.github/copilot-instructions.md` When

- the guidance applies across most of the repository
- the rule is stable and high-level
- you want to define general build, validation, safety, and working-style expectations

Do not use it for:

- deep frontend-only or backend-only conventions
- long workflow checklists
- ownership boundaries
- one-off project history or rationale

### Use `.github/instructions/*.instructions.md` When

- the guidance applies to a specific folder, file pattern, technology slice, or architectural layer
- the repo has meaningful differences between frontend, backend, database, docs, tests, or infrastructure work
- a general repo rule would be too vague for the area

Do not use it for:

- rules that apply almost everywhere
- recurring workflows better represented as skills
- ownership boundaries better represented in `AGENTS.md`

### Use `.github/skills/**/SKILL.md` When

- the team repeats the same workflow often
- the workflow benefits from a deterministic checklist
- the task should be easy for Copilot to trigger from user intent

Good examples:

- repo onboarding
- bug triage
- release check
- change safety review
- migration review

Do not use it for:

- broad coding conventions
- static folder-specific rules
- one skill per language by default

### Use `AGENTS.md` When

- you need clear ownership boundaries
- work frequently crosses frontend, backend, schema, docs, testing, or infrastructure boundaries
- you want consistent handoff rules

Do not use it for:

- executable custom Copilot agents
- workflow checklists
- coding style guidance

### Use `.github/agents/*.agent.md` When

- a specialist role is useful across multiple tasks
- the agent should provide a narrow type of analysis or review
- the same specialized review keeps recurring

Good examples:

- api contract reviewer
- migration safety reviewer
- accessibility reviewer
- release readiness checker

Do not use it for:

- general team ownership
- broad "backend expert" or "frontend expert" agents unless there is a very strong reason
- one agent per language or framework by default

## Decision Checklist

Before adding a new file, ask:

1. Does this already fit in an existing artifact?
2. Is the new artifact solving a recurring problem?
3. Is it narrow enough to stay useful?
4. Will the team know when to use it?
5. Does it duplicate guidance already written elsewhere?

If the answer to any of the last two questions is no, do not add the new artifact yet.
