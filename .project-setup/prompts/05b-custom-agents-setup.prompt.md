# Prompt: Create Custom Copilot Agents

Use this when you want a small number of specialist `.github/agents/*.agent.md` profiles.

```md
Create 2 to 4 custom GitHub Copilot agent profiles for this repository under `.github/agents/`.

Before writing:
- read `.project-setup/CONVENTIONS.md`
- adapt the matching templates under `.project-setup/templates/.github/agents/`
- preserve the file layout `.github/agents/<agent-name>.agent.md`
- preserve the frontmatter shape and key order:
  - `name`
  - `description`
  - `tools` only if intentionally restricting tools
- do not confuse custom agent profiles with `AGENTS.md`
- do not create one custom agent per language or framework unless the repository has a repeated specialized workflow that clearly justifies it

Goals:
- create specialist agents for recurring high-value tasks
- keep each agent narrow and triggerable
- align each agent with the repository's real architecture and workflows

Good candidate agents:
- `api-contract-reviewer`
- `migration-safety-reviewer`
- `accessibility-reviewer`
- `performance-hotspot-reviewer`
- `release-readiness-checker`

For each selected custom agent:
- explain why it belongs in this repository
- write the `.agent.md` file
- keep the body structure consistent:
  - role
  - when to use
  - workflow
  - guardrails
  - expected output
- reference only real repo files, commands, and constraints

Also provide a short note explaining why any candidate agent was omitted.
```
