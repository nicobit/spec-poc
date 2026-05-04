# Copilot Project Setup Kit

This folder is a reusable starter kit for setting up GitHub Copilot in a new repository before adopting a spec-driven workflow such as OpenSpec or spec-kit.

It gives you:

- prompts you can paste into GitHub Copilot Chat or agent mode
- starter templates for repository instructions
- an `AGENTS.md` scaffold
- starter templates for custom Copilot agents
- path-specific instruction templates
- a small set of high-value starter skills
- a conventions file to keep naming and headers consistent
- rollout and governance guides for teams
- a starter stack pack for `.NET`

The templates are intentionally generic and meant to be adapted to the target project's stack, folder layout, and team conventions.

## Goals

- create a strong Copilot baseline before introducing formal specs
- keep repository guidance explicit, reviewable, and maintainable
- encourage safe changes, clear ownership, and deterministic validation
- make later spec-driven adoption easier by documenting assumptions, constraints, and acceptance criteria early

## Suggested Order

1. Read [CONVENTIONS.md](./CONVENTIONS.md) first.
2. Start with [prompts/01-project-discovery.prompt.md](./prompts/01-project-discovery.prompt.md).
3. Use the discovery output to fill in the templates under [templates](./templates).
4. Create `.github/copilot-instructions.md` first.
5. Add `AGENTS.md`.
6. Add only the path-specific instructions you actually need.
7. Add 2-4 starter skills, not dozens.
8. Run [prompts/06-review-and-tighten.prompt.md](./prompts/06-review-and-tighten.prompt.md).
9. Run [prompts/07-normalize-structure.prompt.md](./prompts/07-normalize-structure.prompt.md).

## Folder Layout

```text
.project-setup/
  ADDITION-RULES.md
  ANTI-PATTERNS.md
  CONVENTIONS.md
  DECISION-GUIDE.md
  README.md
  ROLLOUT-PLAN.md
  stacks/
  prompts/
  templates/
```

## Recommended Target Repo Layout

```text
.github/
  agents/
    <agent-name>.agent.md
  copilot-instructions.md
  instructions/
    frontend.instructions.md
    backend.instructions.md
    testing.instructions.md
    docs.instructions.md
  skills/
    repo-onboarding/
      SKILL.md
    bug-triage/
      SKILL.md
    change-safety-review/
      SKILL.md
    release-check/
      SKILL.md
AGENTS.md
docs/
  adr/
  standards/
```

## Notes

- These files are original starter templates informed by current GitHub Copilot customization guidance and the structure used in `github/awesome-copilot`.
- Prefer adapting examples over copying large collections wholesale.
- Keep repository-wide instructions short; move specialized guidance into path instructions or skills.
- Keep custom agents narrow and specialist; do not use them as a substitute for `AGENTS.md`.
- If you use the prompts in sequence, treat `CONVENTIONS.md` and the files under `templates/` as the canonical shape to preserve.

## Reference Projects

Open source repositories worth studying for real-world Copilot customization patterns (instructions, skills, agents).

### VS Code Chat Participant / LM API

- **[microsoft/vscode-extension-samples — chat-sample](https://github.com/microsoft/vscode-extension-samples/tree/main/chat-sample)**
  Canonical Microsoft sample for registering a VS Code Chat Participant. Shows `vscode.lm.selectChatModels`, streaming responses, and tool calls. Best starting point for any chat extension.

- **[microsoft/vscode-chat-extension-utils](https://github.com/microsoft/vscode-chat-extension-utils)**
  Small utility library from Microsoft for chat extensions. Useful reference for the tool-calling loop pattern with `vscode.lm`.

- **[microsoft/vscode-copilot-chat](https://github.com/microsoft/vscode-copilot-chat)**
  The actual Copilot Chat extension source. Heavier, but shows how Microsoft handles multi-turn context and model selection at scale. Check the `.github` folder for dogfooded instructions.

### Copilot Instructions, Skills, and Agents

- **[github/docs](https://github.com/github/docs)**
  Large real-world repo that has adopted `copilot-instructions.md`. Good example of instructions scoped to a specific codebase and team workflow.

- **[Azure-Samples org](https://github.com/Azure-Samples)**
  Microsoft has been seeding sample repos demonstrating Copilot agent mode customization. Search the org for repos containing `.github/copilot-instructions.md`.

- **[copilot-extensions org](https://github.com/copilot-extensions)**
  GitHub's org for Copilot extension samples. The `blackbeard-extension` and `preview-sdk-example` show the skillset pattern. Different surface from VS Code chat participants but shares the agentic loop concepts.

- **[Azure-Samples/azure-finops-agent — .github](https://github.com/Azure-Samples/azure-finops-agent/tree/main/.github)**
  Real Azure sample with agent and instructions setup. Good reference for how Microsoft structures `.github/` for Copilot agent mode.

- **[Azure-Samples/chat-with-your-data-solution-accelerator](https://github.com/Azure-Samples/chat-with-your-data-solution-accelerator)**
  Production-grade Azure accelerator. Worth inspecting the `.github/` folder for instructions and agent patterns applied to a large codebase.

### QA / Testing (Playwright, Python)

- **[github/awesome-copilot](https://github.com/github/awesome-copilot)**
  The official GitHub collection of reusable Copilot customizations. The most authoritative reference for QA patterns. Key files:
  - [`instructions/playwright-typescript.instructions.md`](https://github.com/github/awesome-copilot/blob/main/instructions/playwright-typescript.instructions.md) — web-first assertions, role-based locators, Page Object Model
  - [`instructions/playwright-dotnet.instructions.md`](https://github.com/github/awesome-copilot/blob/main/instructions/playwright-dotnet.instructions.md)
  - [`skills/playwright-generate-test/SKILL.md`](https://github.com/github/awesome-copilot/blob/main/skills/playwright-generate-test/SKILL.md) — skill for generating Playwright tests on demand
  - [`skills/webapp-testing/SKILL.md`](https://github.com/github/awesome-copilot/blob/main/skills/webapp-testing/SKILL.md) — end-to-end web app testing skill
  - [`prompts/playwright-generate-test.prompt.md`](https://github.com/github/awesome-copilot/blob/main/prompts/playwright-generate-test.prompt.md)

- **[jaktestowac/awesome-copilot-for-testers](https://github.com/jaktestowac/awesome-copilot-for-testers)**
  Community-driven collection specifically for test automation. Includes custom instructions, prompt templates, and subagent orchestration for frontend/backend testing with Playwright MCP.

- **[effiziente1/playwrightSample](https://github.com/effiziente1/playwrightSample)**
  Minimal Playwright + TypeScript project with `.github/copilot-instructions.md`. Good small example of strict typing conventions and Page Object guidance for Copilot.

- **[Wopee-io/BDD-Copilot-with-Playwright](https://github.com/Wopee-io/BDD-Copilot-with-Playwright)**
  Playwright + Cucumber/Gherkin (BDD) with Copilot agent configurations. Workshop-style, good if your QA workflow is BDD-oriented.

- **[duthaho/copilot-instructions](https://github.com/duthaho/copilot-instructions)**
  Python/pytest-focused. `.github/copilot-instructions.md` covering DDD, Clean Architecture, testing conventions, and commit standards. Rare Python example — most Copilot QA repos target TypeScript/Playwright.

### Discovery Tip

Search GitHub directly for real-world examples:
- `filename:copilot-instructions.md` — finds repos that have adopted workspace instructions
- `path:.github/agents` — finds repos using custom Copilot agents
- `path:.github/skills` — finds repos with defined skills
