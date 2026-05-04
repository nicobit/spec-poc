# Copilot Customization Conventions

This file is the canonical source of truth for naming, placement, header shape, and section structure in this setup kit.

When using the prompts in this folder, always adapt the templates instead of inventing new file names or formats.

## Core Rule

- Prompts are for analysis and adaptation.
- Templates are for structure.
- If a generated file conflicts with these conventions, normalize it to these conventions.

## Directory Conventions

Use this target layout unless the repository has a strong existing reason to differ:

```text
.github/
  agents/
    <agent-name>.agent.md
  copilot-instructions.md
  instructions/
    <area>.instructions.md
  skills/
    <skill-name>/
      SKILL.md
AGENTS.md
```

## Naming Conventions

### Repository-Wide Instructions

- File name must be exactly `.github/copilot-instructions.md`
- Do not create alternatives such as `copilot.md`, `instructions.md`, or `repo-instructions.md`

### Path-Specific Instructions

- Files must live under `.github/instructions/`
- File names must use lowercase kebab-case plus `.instructions.md`
- Examples:
  - `frontend.instructions.md`
  - `backend.instructions.md`
  - `testing.instructions.md`
  - `docs.instructions.md`
  - `database.instructions.md`

### Skills

- Each skill must live in its own folder under `.github/skills/`
- Folder names must use lowercase kebab-case
- The skill file name must be exactly `SKILL.md`
- Examples:
  - `.github/skills/repo-onboarding/SKILL.md`
  - `.github/skills/bug-triage/SKILL.md`

### Agents

- The repository-level agent file must be named exactly `AGENTS.md`
- Do not create alternate names such as `agents.md` or `COPILOT-AGENTS.md`

### Custom Copilot Agent Profiles

- Custom Copilot agent profiles must live under `.github/agents/`
- File names must use lowercase kebab-case and end with `.agent.md`
- Examples:
  - `.github/agents/api-contract-reviewer.agent.md`
  - `.github/agents/green-coding-optimizer.agent.md`
  - `.github/agents/release-readiness-checker.agent.md`

## Content Conventions

### `.github/copilot-instructions.md`

Purpose:
- repository-wide rules that apply almost everywhere

Keep it:
- concise
- practical
- high-signal

Recommended section structure:

```md
# Repository Instructions

## Build And Validate
...

## Change Safety
...

## Working Style
...

## Preparing For Later Spec-Driven Development
...
```

Rules:
- no frontmatter
- no long prose
- no team manifesto language
- no duplicated deep tech-specific guidance that belongs in path instructions

### `.github/instructions/*.instructions.md`

Purpose:
- area-specific rules for a technology slice, layer, or folder group

Header format:

```md
---
applyTo: "glob"
---

# Area Instructions
```

Rules:
- always include frontmatter
- use only the `applyTo` key unless the repository already uses a different documented schema
- keep the title short and stable
- scope content to that area only
- do not repeat the full repository-wide guidance

### `.github/skills/**/SKILL.md`

Purpose:
- repeatable workflows, not broad coding standards

Header format:

```md
---
name: skill-name
description: One-sentence explanation of when to use this skill.
---
```

Recommended section structure:

```md
# Skill Title

Use this skill when the user asks things like:
- ...

## Workflow
1. ...

## Guardrails
- ...

## Output
- ...
```

Rules:
- one skill per recurring workflow
- no one-skill-per-language by default
- trigger phrases should be examples, not a giant keyword dump
- reference only real repo files, commands, and folders
- keep each skill narrow enough to be triggered correctly

### `AGENTS.md`

Purpose:
- ownership boundaries and handoff rules

Recommended section structure:

```md
# AGENTS.md

## Global Handoff Rules
...

## Precedence Rules
...

## Definition Of Done
...

## <Agent Name>
**Responsibilities**
...

**Allowed areas**
...

**Forbidden areas**
...

**Handoff rules**
...

**Done checklist**
...
```

Rules:
- use domain-focused agents, not personality-focused agents
- do not create too many agents
- every agent should have a clear reason to exist
- include a Testing agent and a Docs agent unless the repo is extremely small

### `.github/agents/*.agent.md`

Purpose:
- define a GitHub Copilot custom agent profile for a narrow specialist role

Header format:

```md
---
name: agent-name
description: One-sentence explanation of what this agent does and when to use it.
tools: ["read", "search", "edit"]
---
```

Recommended body structure:

```md
# Agent Title

## Role
...

## When To Use
- ...

## Workflow
1. ...

## Guardrails
- ...

## Expected Output
- ...
```

Rules:
- custom agent profiles are different from `AGENTS.md`
- `AGENTS.md` defines ownership and handoff rules
- `.github/agents/*.agent.md` defines executable specialist Copilot agents
- include `name` and `description`
- include `tools` only if you intentionally want to restrict tools
- include `model` only if your team intentionally standardizes a model choice
- include `mcp-servers` only if the agent truly needs them
- the body prompt matters more than the frontmatter alone
- keep each agent narrow and role-based, not personality-based
- do not create one custom agent per language by default
- prefer custom agents for recurring specialist workflows such as:
  - api contract review
  - migration safety review
  - accessibility review
  - performance hotspot review
  - release readiness

## Decision Rules

Use:

- `.github/copilot-instructions.md` for global engineering rules
- `.github/instructions/*.instructions.md` for technology or folder-specific conventions
- `.github/skills/**/SKILL.md` for recurring workflows
- `AGENTS.md` for ownership and handoff boundaries
- `.github/agents/*.agent.md` for specialist custom Copilot agents that your team can invoke directly

Do not:

- create one skill per language unless there is a repeated, specialized workflow
- create one custom agent per language unless there is a repeated, specialized workflow
- duplicate the same rule in all three places
- invent new header formats when adapting templates

## Normalization Checklist

Before accepting generated files, verify:

- file names match these conventions
- folders match these conventions
- frontmatter shape matches these conventions
- section headings follow the expected structure
- no duplicate guidance is spread across multiple files
- content is adapted from templates rather than improvised from scratch
