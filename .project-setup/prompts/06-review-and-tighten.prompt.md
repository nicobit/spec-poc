# Prompt: Review and Tighten the Setup

Use this after the first pass is in place.

```md
Review the Copilot customization files in this repository and tighten them.

Before reviewing:
- read `.project-setup/CONVENTIONS.md`
- treat naming, frontmatter, and section structure in that file as the canonical standard
- when in doubt, normalize files back toward the templates instead of inventing a new style

Files to review:
- `.github/copilot-instructions.md`
- `.github/agents/**/*.agent.md`
- `.github/instructions/**/*.instructions.md`
- `AGENTS.md`
- `.github/skills/**/SKILL.md`

Review for:
- overlap or duplication
- vague instructions that are hard to follow
- invented commands or nonexistent paths
- missing guardrails for risky areas
- too many agents or skills
- missing validation expectations
- places where guidance should be moved from repo-wide instructions into path-specific instructions or skills

Deliverables:
1. Findings
2. Suggested simplifications
3. Suggested additions
4. A tightened version of each file that needs changes

Bias toward fewer, clearer files with stronger operational guidance.
```
