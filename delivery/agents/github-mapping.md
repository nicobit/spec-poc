# GitHub Agent Mapping

This document maps the GitHub Copilot agent layer to the canonical framework agent model.

Use it together with:

- `agent-model.md`
- `../roles/agent-role-catalog.md`
- `../workflows/agent-orchestration.md`

## Mapping Table (updated 2026-03-28)

| Platform agent file | Canonical agent | Adapter path | Status | Notes |
| --- | --- | --- | --- | --- |
| `feature-orchestrator.agent.md` | `Feature Orchestrator` | `.github/agents/feature-orchestrator.agent.md` | aligned | Primary orchestrator adapter |
| `business-analyst.agent.md` | `Business Analyst` | `.github/agents/business-analyst.agent.md` | aligned | |
| `architect.agent.md` | `Solution Architect` | `.github/agents/architect.agent.md` | aligned | |
| `test-manager.agent.md` | `Test Manager` | `.github/agents/test-manager.agent.md` | aligned | |
| `reactjs-expert.agent.md` | `Frontend Engineer` (specialization) | `.github/agents/reactjs-expert.agent.md` | aligned | Technology specialization — map to `Frontend Engineer` in orchestration logic |
| `python-engineer.agent.md` | `Backend Engineer` (specialization) | `.github/agents/python-engineer.agent.md` | aligned | Technology specialization — map to `Backend Engineer` in orchestration logic |
| `devops-engineer.agent.md` | `DevOps Engineer` | `.github/agents/devops-engineer.agent.md` | aligned | |
| `ux-expert.agent.md` | `UX Expert` | `.github/agents/ux-expert.agent.md` | aligned | Gate/review agent |
| `automation-tester.agent.md` | `Automation Tester` | `.github/agents/automation-tester.agent.md` | aligned | Gate/review agent |
| `security-reviewer.agent.md` | `Security Reviewer` | `.github/agents/security-reviewer.agent.md` | aligned | Gate/review agent |
| `documentation-owner.agent.md` | `Documentation Owner` | `.github/agents/documentation-owner.agent.md` | aligned | Gate/review agent |

## Coverage assessment

GitHub provides the most complete set of platform adapters for the canonical model. The adapter files in `.github/agents/` are the authoritative GitHub-side implementations; orchestration code in `delivery/` should reference canonical agent names and map to these specialized adapters where necessary.

## Adapter guidance

- Keep platform adapters concise — map back to canonical names in `delivery/`.
- Mark technology-specific adapters (`reactjs-expert`, `python-engineer`) explicitly as specializations in orchestration logic.

## Maintenance

When adding or changing a GitHub adapter, update this file's table `Adapter path` and set the `Status` to `aligned` / `partial` / `missing`. Consider adding a `last-updated` annotation in the adapter file's YAML/frontmatter.
