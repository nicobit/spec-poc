# Prompt: Normalize Naming And Structure

Use this after the customization files have been drafted.

```md
Normalize the Copilot customization files in this repository to a consistent naming and structure standard.

Before reviewing:
- read `.project-setup/CONVENTIONS.md`
- treat `.project-setup/templates/` as the canonical structural baseline

Files to check:
- `.github/copilot-instructions.md`
- `.github/agents/**/*.agent.md`
- `.github/instructions/**/*.instructions.md`
- `.github/skills/**/SKILL.md`
- `AGENTS.md`

Tasks:
- verify file names follow the conventions exactly
- verify folder placement follows the conventions exactly
- verify path-specific instructions use consistent frontmatter
- verify custom agent profiles use the same frontmatter shape and similar section order
- verify skills use the same frontmatter keys and similar section order
- verify `AGENTS.md` uses a stable section layout
- detect duplicate guidance that should be consolidated
- detect files that should be renamed, merged, or split

Deliverables:
1. Files that already conform
2. Files that need normalization
3. Exact rename or rewrite recommendations
4. A normalized version of any file that should change

Constraints:
- do not invent new file formats
- prefer adapting toward the templates over creating a novel structure
- keep the setup minimal and consistent
```
