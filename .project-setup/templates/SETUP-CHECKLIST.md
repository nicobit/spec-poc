# Copilot Setup Checklist

Use this checklist in the target repository.

## Baseline

- [ ] Read `.project-setup/CONVENTIONS.md`
- [ ] Create `.github/copilot-instructions.md`
- [ ] Add custom Copilot agents only if there are a few clear specialist workflows
- [ ] Keep repository-wide instructions short and universal
- [ ] Add only path-specific instructions justified by the repo layout
- [ ] Create `AGENTS.md` with real ownership boundaries
- [ ] Add 2 to 4 focused starter skills

## Quality

- [ ] Remove invented commands, paths, or tools
- [ ] Replace placeholders with real stack details
- [ ] Ensure build and test expectations match the repo
- [ ] Ensure instructions do not conflict with each other
- [ ] Keep skills narrow and triggerable
- [ ] Keep custom agents narrow and specialist

## Spec-Ready Habits

- [ ] Require assumptions to be stated when requirements are incomplete
- [ ] Capture constraints and acceptance criteria for non-trivial work
- [ ] Use ADRs or design notes for important cross-cutting decisions
- [ ] Preserve backward compatibility by default
- [ ] Document migration impact when contracts or schema change

## Tightening Pass

- [ ] Ask Copilot to review overlap between instructions, agents, and skills
- [ ] Run a normalization pass for naming, frontmatter, and section structure
- [ ] Remove low-value or duplicate files
- [ ] Strengthen guardrails for the riskiest parts of the codebase
- [ ] Run one real task using the setup and refine based on the result
