# .NET Starter Pack

Use this starter pack when the target repository is primarily `.NET` or `C#`.

This pack is intentionally conservative:

- path-specific guidance belongs in instructions
- only repeated specialist reviews should become custom agents
- avoid creating generic `csharp-skill` or `.net-agent` files

## Recommended Files

- `.github/copilot-instructions.md`
- `.github/instructions/backend.instructions.md`
- `.github/instructions/testing.instructions.md`
- `.github/instructions/docs.instructions.md`
- optionally `.github/instructions/database.instructions.md`
- `AGENTS.md`
- 2 to 4 skills
- 0 to 2 custom agents

## Good .NET-Specific Candidates

Path-specific instructions:

- ASP.NET API conventions
- EF Core or migration conventions
- testing conventions for xUnit, NUnit, or integration tests

Skills:

- migration review
- api change safety review
- release check

Custom agents:

- api contract reviewer
- migration safety reviewer

## Avoid

- `csharp-skill`
- `.net-expert.agent.md`
- duplicate async or DI guidance across many files
