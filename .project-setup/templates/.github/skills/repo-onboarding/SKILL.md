---
name: repo-onboarding
description: Use this skill when the user wants to understand a repository quickly, map its architecture, find entry points, or prepare the project for Copilot customization and later spec-driven work.
---

# Repo Onboarding

Use this skill when the user asks things like:

- "Map this repo"
- "Help me understand the architecture"
- "What should we set up first for Copilot here?"
- "Prepare this codebase for better AI-assisted development"

## Workflow

1. Identify the product purpose and main runtime boundaries.
2. Map the top-level folders and their likely responsibilities.
3. Find real build, test, lint, type-check, run, and deployment commands.
4. Identify risky zones that deserve explicit instructions or ownership rules.
5. Recommend:
   - repository-wide Copilot instructions
   - path-specific instructions
   - agent boundaries
   - 3 to 5 high-value starter skills
6. Call out missing documentation, ambiguous ownership, or risky hidden conventions.

## Output

Provide:

- a short architecture map
- the real developer commands found in the repo
- recommended Copilot customization files to create
- a short list of guardrails that would improve safe AI-assisted changes
