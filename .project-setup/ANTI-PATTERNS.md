# Copilot Setup Anti-Patterns

These are the most common ways teams overcomplicate Copilot customization.

## Do Not Create One Skill Per Technology

Bad:

- `csharp-skill`
- `react-skill`
- `python-skill`

Why this fails:

- too broad
- duplicates instruction files
- unclear when to trigger
- becomes stale quickly

Better:

- `migration-review`
- `api-change-safety-review`
- `ui-accessibility-review`

## Do Not Create One Custom Agent Per Language

Bad:

- `csharp-expert.agent.md`
- `typescript-expert.agent.md`
- `sql-expert.agent.md`

Why this fails:

- encourages vague prompts
- overlaps with existing repo instructions
- weakens specialist focus

Better:

- `api-contract-reviewer.agent.md`
- `performance-hotspot-reviewer.agent.md`
- `release-readiness-checker.agent.md`

## Do Not Duplicate The Same Rule Everywhere

Bad:

- same testing rule in repo-wide instructions, backend instructions, frontend instructions, and three skills

Why this fails:

- drift
- contradiction
- noisy maintenance

Better:

- keep global rules global
- keep area rules local
- keep workflow steps in skills

## Do Not Confuse Ownership With Execution

Bad:

- putting team ownership rules inside `.github/agents/*.agent.md`
- using `AGENTS.md` as if it were a Copilot execution profile

Better:

- `AGENTS.md` defines ownership and handoffs
- `.github/agents/*.agent.md` defines specialist Copilot agents

## Do Not Add Too Many Artifacts At Once

Bad:

- 1 repo-wide instruction file
- 8 path-specific instruction files
- 12 skills
- 9 custom agents

Why this fails:

- unclear signal
- high maintenance
- overlapping content

Better starting point:

- 1 repo-wide instruction file
- 2 to 4 path-specific instruction files
- 2 to 4 skills
- 0 to 2 custom agents initially

## Do Not Invent Commands, Tools, Or Files

Bad:

- referencing scripts that do not exist
- describing a CI job that is not in the repo
- pointing a skill to a nonexistent runbook

Better:

- reference only real commands, paths, and workflows
- call out missing infrastructure explicitly

## Do Not Use Repo-Wide Instructions As A Manifesto

Bad:

- long philosophical guidance
- team culture statements with no operational value

Better:

- short, practical, enforceable guidance

## Do Not Skip Normalization

Bad:

- letting each prompt produce a slightly different file shape

Better:

- run a final normalization pass against `CONVENTIONS.md`
