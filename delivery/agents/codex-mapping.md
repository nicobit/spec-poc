# Codex Agent Mapping

This document maps the Codex adapter layer to the canonical framework agent model.

Use it together with:

- `agent-model.md`
- `../roles/agent-role-catalog.md`
- `../workflows/agent-orchestration.md`

## Mapping Table (updated 2026-03-28)

| Mechanism / file (expected) | Canonical agent | Adapter path | Status | Notes |
| --- | --- | --- | --- | --- |
| `feature-orchestrator.md` | `Feature Orchestrator` | (not present) | missing | Codex currently relies on prompt/skill routing rather than concrete adapter files |
| `role-routing.md` | `Feature Orchestrator` (fallback) | (not present) | partial | routing guidance used as an orchestrator substitute in prose |
| `business-analyst.md` | `Business Analyst` | (not present) | missing | |
| `architect.md` | `Solution Architect` | (not present) | missing | |
| `test-manager.md` | `Test Manager` | (not present) | missing | |
| `reactjs-expert.md` | `Frontend Engineer` (specialization) | (not present) | missing | technology specialization — prefer canonical mapping in delivery/ |
| `python-engineer.md` | `Backend Engineer` (specialization) | (not present) | missing | technology specialization — prefer canonical mapping in delivery/ |
| `devops-engineer.md` | `DevOps Engineer` | (not present) | missing | |

## Coverage assessment

Codex currently uses feature-delivery prompts and skills for many responsibilities; it does not expose dedicated adapter files under a `.codex/` directory in this repository. Update this table if adapter files are added.

## Adapter guidance

- Keep canonical sequencing in `delivery/` rather than platform-only prose.
- When adding Codex adapter files, add `last-updated: YYYY-MM-DD` frontmatter and update this table's `Adapter path` and `Status`.

## Recommended next step

Decide whether to add a `.codex/` adapter directory with explicit adapter files, or to keep Codex behavior as prompt/skill-based guidance.
