# Prompt: Create Starter Skills

Use this when you want a few focused skills rather than many broad ones.

```md
Create 3 to 5 starter skills for this repository under `.github/skills/`.

Before writing:
- read `.project-setup/CONVENTIONS.md`
- adapt the matching templates under `.project-setup/templates/.github/skills/`
- preserve the file layout `.github/skills/<skill-name>/SKILL.md`
- preserve the frontmatter keys:
  - `name`
  - `description`
- do not invent one skill per language or framework unless the repository has a repeated specialized workflow that justifies it

Goals:
- support high-value recurring workflows
- keep each skill narrow and easy for Copilot to trigger correctly
- prepare the team for later spec-driven work without requiring it yet

Preferred starter skills:
- `repo-onboarding`
- `bug-triage`
- `change-safety-review`
- `release-check`

Optionally replace one of the above with a more project-specific skill if the repo has a clear recurring workflow.

For each skill:
- write `SKILL.md`
- include a clear description of when to use it
- include trigger phrases
- provide a deterministic checklist or workflow
- reference local files or folders only if they actually exist
- avoid promising tools, scripts, or resources that are not present

Keep the skills concise and practical. They should complement repository instructions, not duplicate them.
```
