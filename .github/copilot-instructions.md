# GitHub Copilot Instructions

This repository demonstrates spec-driven development. Copilot should treat repository specifications and standards as the primary source of truth.

Use [README.md](../README.md) as the main repository map, [Spec-Driven Delivery](../delivery/workflows/spec-driven-delivery.md) as the canonical workflow, and [AI Working Contract](../delivery/governance/ai-working-contract.md) as the shared minimum behavior layer across Copilot, Codex, and Claude.

## Read Before Editing

Review these files first when relevant:

- `delivery/workflows/business-to-spec-workflow.md`
- `delivery/workflows/spec-driven-delivery.md`
- `delivery/governance/ai-working-contract.md`
- `delivery/workflows/copilot-agent-routing.md`
- `delivery/governance/traceability.md`
- `docs/standards/engineering/engineering-standards.md`
- `delivery/roles/agent-role-catalog.md`
- `delivery/roles/`

## Copilot Customization Model

This repository uses the following GitHub Copilot customization layers:

- repository-wide instructions in `.github/copilot-instructions.md`
- path-specific instructions in `.github/instructions/*.instructions.md`
- custom agents in `.github/agents/*.agent.md`
- reusable skills in `.github/skills/*/SKILL.md`
- optional reusable prompt files in `.github/prompts/*.prompt.md`

`.github/agents/*.agent.md` is the canonical Copilot agent layer for this repository. Prompt files are task entrypoints and should not be treated as a parallel role model.

## Custom Agents

Copilot custom agents live in:

- `.github/agents/feature-orchestrator.agent.md`
- `.github/agents/business-analyst.agent.md`
- `.github/agents/architect.agent.md`
- `.github/agents/ux-expert.agent.md`
- `.github/agents/test-manager.agent.md`
- `.github/agents/automation-tester.agent.md`
- `.github/agents/reactjs-expert.agent.md`
- `.github/agents/python-engineer.agent.md`
- `.github/agents/devops-engineer.agent.md`
- `.github/agents/security-reviewer.agent.md`
- `.github/agents/documentation-owner.agent.md`

These agents use explicit tool scopes rather than the default all-tools behavior.

## Prompt Files

Reusable Copilot prompt files live in `.github/prompts/`:

**Core Entry Prompts**
- `feature-delivery.prompt.md` — start a feature end-to-end
- `orchestrate-feature-from-spec.prompt.md` — drive an existing feature package through the workflow

Prompt files are convenience entrypoints for concrete tasks. They should defer to the canonical role and workflow guidance in `.github/agents/`, `delivery/workflows/`, and `delivery/governance/` rather than redefining those layers.

Advanced phase-specific prompts are archived under `.github/prompts/advanced/` and are not part of the primary end-user path.

## Agent Routing

Use [copilot-agent-routing.md](../delivery/workflows/copilot-agent-routing.md) to decide:

- which agent to start with
- when to switch from refinement to design to implementation
- when to use a skill instead of a broader agent
- when review roles like Security Reviewer or Documentation Owner should be involved

Use [github-mapping.md](../delivery/agents/github-mapping.md) when you need the canonical mapping between GitHub agents and the framework agent model.

When you want one sequential entrypoint from an existing feature package, start with:

- `Feature Orchestrator`
- or `.github/prompts/orchestrate-feature-from-spec.prompt.md`

## Delivery Rules

The shared contract in [AI Working Contract](../delivery/governance/ai-working-contract.md) is canonical. The bullets below intentionally restate the highest-signal workflow rules locally so Copilot can follow them reliably without depending only on cross-file resolution.

- Follow [AI Working Contract](../delivery/governance/ai-working-contract.md) for the minimum feature package, implementation-transition checkpoint, clarifying-question threshold, and trivial-change exemption.
- Treat a short high-level request as valid input for orchestration.
- Start feature-like work with `Feature Orchestrator` or the feature-orchestration prompt, not with implementation.
- Classify the request as feature, UI standardization, backend or platform change, bug fix, docs-only, or trivial change.
- Treat UI standardization, shared component adoption, and layout harmonization as feature-like work.
- If the request comes from a business user, start by refining it with the business request and spec refinement templates.
- Do not jump directly from a raw request to code when a governing feature package is missing or stale.
- For feature-like work, stop and create or update the feature package under `specs/features/FEAT-<area>-<id>-<short-name>/` before writing code.
- If the user says "create a feature" or uses similar language without explicitly asking for implementation now, treat that as a spec-first request, not a coding request.
- If the user says "add a feature" or "add a new feature" without explicitly asking for implementation now, treat that as a spec-first request, not a coding request.
- When a raw feature request creates tension between "implement immediately" and "create or update the governing feature package first", the spec-first workflow wins.
- If the request extends an existing page, module, workflow, or shipped capability, update the existing governing `FEAT-...` package by default unless the new work is clearly separate.
- After creating or materially refining a new feature package, pause unless the user has asked to proceed or the request clearly implies implementation now.
- Any implementation response should name the exact `feature-spec.md` and `test-plan.md` it is following.
- Preserve links between requirements, acceptance criteria, tests, and implementation.
- Update automated tests when behavior changes.
- Update documentation when the delivered behavior changes.
- If a change affects roles, route protection, or authorization behavior, update the access-control docs in `docs/standards/security/access-control-matrix.md` and `docs/standards/security/module-authorization.md`.
- Use the trivial-change exemption only for clearly low-risk edits such as typos, copy-only changes, isolated non-behavioral refactors, mechanical config edits, or narrow test-only changes, and say explicitly when you are using it.

Example:

- "Create a feature for adding bulk retire actions to the clients page." -> create or update the governing `FEAT-...` package, start with `business-request.md`, `spec-refinement.md`, and `feature-spec.md`, and do not write implementation code yet unless the user explicitly asks to proceed.
- "Add a feature for showing postponed schedules on the environments dashboard." -> update the existing governing environments/dashboard `FEAT-...` package, refine the spec first, and do not write implementation code yet unless the user explicitly asks to proceed.

## Implementation Rules

- Keep backend domain logic portable across hosting models where practical.
- Treat Azure Functions as an adapter layer, not the only architectural target.
- Prefer `backend/shared/...` for shared backend imports where possible.
- Preserve compatibility with the ASGI runtime in `backend/runtimes/asgi/app.py`.
- Keep backend route auth aligned to the repository policy: only `GET /health/healthz` is public.
- Keep frontend route guards, backend role checks, and authorization documentation aligned.
- Keep Azure Functions `authLevel` intentionally `anonymous` unless the repository policy changes.
- Prefer lazy initialization for secrets, SDK clients, and external connections in backend Python code.
- When changing Azure backend delivery, keep GitHub and GitLab automation paths aligned.
- Keep frontend behavior aligned with UX and accessibility notes.
- Prefer small, reviewable changes over broad rewrites.

## Output Expectations

When helping with a feature, Copilot should aim to produce:

1. feature spec updates if needed
2. task breakdown
3. code changes
4. tests
5. documentation updates
6. validation notes

## Ambiguity Handling

If requirements are incomplete, explicitly list assumptions and open questions instead of silently inventing behavior. Ask a clarifying question only when [AI Working Contract](../delivery/governance/ai-working-contract.md) says the ambiguity is material enough to require one.
