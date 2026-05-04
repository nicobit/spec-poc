# Prompt: Create Baseline Copilot Instructions

Use this after discovery.

```md
Create a repository-wide `.github/copilot-instructions.md` for this project.

Before writing:
- read `.project-setup/CONVENTIONS.md`
- adapt the structure from `.project-setup/templates/.github/copilot-instructions.md`
- preserve the file name exactly as `.github/copilot-instructions.md`
- do not invent a new header format

The file should:
- be concise and practical
- describe how Copilot should understand the project before editing
- define expectations for build, test, validation, and documentation
- forbid inventing APIs, config keys, migrations, feature flags, or environment variables
- encourage minimal, reviewable changes
- prefer backward-compatible changes unless explicitly asked otherwise
- require assumptions to be stated when requirements are incomplete
- include basic best practices that prepare the repo for later spec-driven development

Also provide:
- 3 path-specific instruction files that would meaningfully improve quality in this repo
- one sentence explaining why each path-specific file exists

Do not create generic fluff. Ground the instructions in the actual repository layout and tooling.
```
