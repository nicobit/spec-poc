# Codex Agent Mapping

This document maps the Codex agent layer to the canonical framework agent model.

Use it together with:

- `agent-model.md`
- `../roles/agent-role-catalog.md`
- `../workflows/agent-orchestration.md`

## Mapping Summary

| Codex Agent Or Mechanism | Canonical Agent | Status | Notes |
| --- | --- | --- | --- |
| `feature-orchestrator.md` | `Feature Orchestrator` | fallback adapter | delegates orchestration through `role-routing.md` until a richer native orchestrator exists |
| `role-routing.md` | `Feature Orchestrator` fallback | partial | routing guidance used by the orchestrator adapter |
| `business-analyst.md` | `Business Analyst` | direct | aligned |
| `architect.md` | `Solution Architect` | direct | aligned |
| `test-manager.md` | `Test Manager` | direct | aligned |
| `reactjs-expert.md` | `Frontend Engineer` | specialization | technology-specific frontend specialization |
| `python-engineer.md` | `Backend Engineer` | specialization | technology-specific backend specialization |
| `devops-engineer.md` | `DevOps Engineer` | direct | aligned |

## Coverage Assessment

Codex currently supports the core design and implementation path, but it does not yet expose:

- direct gate/review agents for `UX Expert`
- `Automation Tester`
- `Security Reviewer`
- `Documentation Owner`
- `QA Reviewer`

Those responsibilities currently exist through the feature-delivery prompt, skills, or routing guidance rather than dedicated agent adapters.

## Framework Interpretation

For Codex, the current fallback mapping is:

- `role-routing.md` acts as the orchestrator substitute
- the feature-delivery prompt and skills carry some gate/review behavior
- direct agents cover only a reduced core subset

This is workable, but weaker than the canonical model.

## Adapter Rule

When updating Codex adapters:

1. treat `role-routing.md` as a temporary orchestrator fallback, not the final model
2. prefer adding missing gate/review agents only when Codex can expose them cleanly as adapters
3. keep canonical sequencing in `delivery/`, not in Codex-only prose

## Recommended Next Step

Add direct gate/review agent adapters only when they provide clearer execution than the feature-delivery prompt or skills.
