# How To Apply This Kit

Use this playbook when introducing GitHub Copilot customization into a new repository.

The goal is to create a small, consistent, maintainable setup rather than generating every possible artifact.

## Before You Start

Read these first:

- `CONVENTIONS.md`
- `DECISION-GUIDE.md`
- `ANTI-PATTERNS.md`

If you are introducing this to a team, also read:

- `ADDITION-RULES.md`
- `ROLLOUT-PLAN.md`

## Recommended Order

### 1. Copy The Kit

Copy `.project-setup` into the target repository.

If the target repository has a matching stack pack, review that too before generating files.

### 2. Discover The Repo

Run:

- `prompts/01-project-discovery.prompt.md`

Goal:

- understand the product, stack, folder layout, commands, risky areas, and recommended Copilot artifacts

Do not create files yet if the discovery result is still vague.

### 3. Create Repository-Wide Instructions

Run:

- `prompts/02-copilot-baseline.prompt.md`

Create:

- `.github/copilot-instructions.md`

Keep it short and universal.

### 4. Create Ownership Boundaries

Run:

- `prompts/03-agents-setup.prompt.md`

Create:

- `AGENTS.md`

This file is for ownership and handoff rules, not executable custom agents.

### 5. Add Path-Specific Instructions

Run:

- `prompts/04-instructions-setup.prompt.md`

Create only the files the repository actually needs, usually 2 to 4:

- `frontend.instructions.md`
- `backend.instructions.md`
- `testing.instructions.md`
- `docs.instructions.md`
- optionally `database.instructions.md` or `infrastructure.instructions.md`

### 6. Add A Small Number Of Skills

Run:

- `prompts/05-skills-setup.prompt.md`

Create 2 to 4 skills only.

Good defaults:

- `repo-onboarding`
- `bug-triage`
- `change-safety-review`
- `release-check`

### 7. Add Custom Agents Only If Clearly Useful

Run only if justified:

- `prompts/05b-custom-agents-setup.prompt.md`

Create 0 to 2 custom agents initially.

Good first candidates:

- `api-contract-reviewer`
- `migration-safety-reviewer`
- `release-readiness-checker`

Do not create one custom agent per language or framework.

### 8. Tighten The Result

Run:

- `prompts/06-review-and-tighten.prompt.md`

Goal:

- remove overlap
- strengthen weak guidance
- catch invented commands or paths

### 9. Normalize The Structure

Run:

- `prompts/07-normalize-structure.prompt.md`

Goal:

- ensure filenames, frontmatter, and section headings follow `CONVENTIONS.md`

### 10. Final Review

Check the result against:

- `templates/SETUP-CHECKLIST.md`

Delete anything that is vague, redundant, or unlikely to be maintained.

## Recommended First Setup Size

Start with:

- 1 repository-wide instruction file
- 1 `AGENTS.md`
- 2 to 4 path-specific instruction files
- 2 to 4 skills
- 0 to 2 custom agents

This is the best default for most repositories.

## If The Repository Is .NET

Also review:

- `stacks/dotnet/README.md`

Use the `.NET` stack pack for better defaults around backend and database guidance.

## Practical Advice

- Use prompts for analysis and adaptation.
- Use templates for structure.
- Keep the setup minimal at first.
- Normalize the result before sharing it with the team.
- Remove low-value artifacts quickly.

## Team Rollout Advice

Do not try to introduce everything at once.

Recommended rollout:

1. Add `copilot-instructions.md`
2. Add `AGENTS.md`
3. Add a few path-specific instructions
4. Add a few skills
5. Add custom agents only if usage patterns justify them
6. Review after real usage and simplify
