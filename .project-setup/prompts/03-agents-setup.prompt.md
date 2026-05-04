# Prompt: Create AGENTS.md

Use this when you want ownership boundaries and handoff rules.

```md
Create an `AGENTS.md` file for this repository.

Before writing:
- read `.project-setup/CONVENTIONS.md`
- adapt `.project-setup/templates/AGENTS.md`
- preserve the file name exactly as `AGENTS.md`
- preserve the standard section structure unless the repository has a strong reason to add a small extra section

Requirements:
- define clear ownership boundaries based on this repo's architecture
- use domain-focused agents, not personality-focused agents
- include:
  - global handoff rules
  - precedence rules where needed
  - per-agent sections with responsibilities, allowed areas, forbidden areas, handoff rules, and done checklist
- include a Testing Agent
- include a Docs Agent
- include one or more domain agents that match the actual stack
- if the repo has frontend code, include a UI or Frontend agent
- if the repo has backend or API code, include a Backend or API agent
- if the repo has persistence or schema concerns, include a Data or Schema agent
- if the repo has cross-cutting architecture risk, include a Quality or Architecture guard

Constraints:
- keep the file operational and easy to review
- do not add meaningless agent proliferation
- preserve clear ownership for high-risk areas
- align done checklists with the repository's real commands and workflows
- do not confuse `AGENTS.md` ownership rules with `.github/agents/*.agent.md` custom Copilot agent profiles
```
