# Prompt: Project Discovery

Use this first in the target repository.

```md
Analyze this repository and prepare a Copilot customization plan.

Before answering:
- read `.project-setup/CONVENTIONS.md`
- assume the templates in `.project-setup/templates/` are the canonical structure to adapt later
- do not invent alternate file names or formats

Deliverables:
- a short summary of the product and its purpose
- the main tech stack and runtime environments
- the top-level folder map with ownership suggestions
- build, test, lint, run, and deployment commands if they exist
- risky areas that deserve explicit guardrails
- a recommendation for:
  - `.github/copilot-instructions.md`
  - `AGENTS.md`
  - path-specific instruction files under `.github/instructions/`
  - 3 to 5 starter skills under `.github/skills/`

Constraints:
- do not invent commands, frameworks, or workflows
- if information is missing, call it out explicitly
- prefer a minimal setup that can be expanded later
- include recommendations that prepare the repo for later spec-driven development

Output format:
1. Project summary
2. Stack and commands
3. Recommended Copilot artifacts
4. Risk areas and guardrails
5. First-pass file tree to create
```
