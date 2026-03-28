# Claude Agent Mapping

This document maps the Claude agent layer to the canonical framework agent model.

Use it together with:

- `agent-model.md`
- `../roles/agent-role-catalog.md`
- `../workflows/agent-orchestration.md`

## Mapping Summary

| Claude Agent Or Mechanism | Canonical Agent | Status | Notes |
| --- | --- | --- | --- |
| `feature-orchestrator.md` | `Feature Orchestrator` | fallback adapter | delegates orchestration through `role-routing.md` until a richer native orchestrator exists |
| `role-routing.md` | `Feature Orchestrator` fallback | partial | routing guidance used by the orchestrator adapter |
| `business-analyst.md` | `Business Analyst` | direct | aligned |
| `architect.md` | `Solution Architect` | direct | aligned |
| `test-manager.md` | `Test Manager` | direct | aligned |
| `reactjs-expert.md` | `Frontend Engineer` | specialization | technology-specific frontend specialization |
| `python-engineer.md` | `Backend Engineer` | specialization | technology-specific backend specialization |
| `devops-engineer.md` | `DevOps Engineer` | direct | aligned |
| `ux-expert.md` | `UX Expert` | direct | gate/review agent |
| `automation-tester.md` | `Automation Tester` | direct | gate/review agent |
| `security-reviewer.md` | `Security Reviewer` | direct | gate/review agent |
| `documentation-owner.md` | `Documentation Owner` | direct | gate/review agent |
| `qa-reviewer.md` | `QA Reviewer` | direct | gate/review agent |

## Coverage Assessment

Claude now covers the full canonical agent set: all core agents and all gate/review agents are represented.

The only remaining gap from the canonical model is the orchestrator: `role-routing.md` still acts as a fallback substitute rather than a first-class orchestrator adapter.

## Framework Interpretation

For Claude, the current mapping is:

- `role-routing.md` acts as the orchestrator substitute
- all core and gate/review agents have direct adapter files
- technology specializations (`reactjs-expert.md`, `python-engineer.md`) are used in place of generic `Frontend Engineer` and `Backend Engineer`

This is aligned with the canonical model except for the orchestrator gap.

## Adapter Rule

When updating Claude adapters:

1. treat `role-routing.md` as a temporary orchestrator fallback, not the final model
2. prefer adding missing gate/review agents only when the Claude platform can expose them cleanly
3. keep canonical sequencing in `delivery/`, not in Claude-only prose

## Recommended Next Step

Add direct gate/review agent adapters only when they provide clearer execution than commands or routing guidance.
