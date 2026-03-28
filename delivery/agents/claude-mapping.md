# Claude Agent Mapping

This document maps the Claude adapter layer to the canonical framework agent model.

Use it together with:

- `agent-model.md`
- `../roles/agent-role-catalog.md`
- `../workflows/agent-orchestration.md`

## Mapping Table (updated 2026-03-28)

| Mechanism / file (expected) | Canonical agent | Adapter path | Status | Notes |
| --- | --- | --- | --- | --- |
| `feature-orchestrator.md` | `Feature Orchestrator` | (not present) | missing | Claude currently relies on routing guidance as a fallback |
| `role-routing.md` | `Feature Orchestrator` (fallback) | (not present) | partial | routing guidance used as an orchestrator substitute in prose |
| `business-analyst.md` | `Business Analyst` | (not present) | missing | |
| `architect.md` | `Solution Architect` | (not present) | missing | |
| `test-manager.md` | `Test Manager` | (not present) | missing | |
| `reactjs-expert.md` | `Frontend Engineer` (specialization) | (not present) | missing | technology specialization — prefer canonical mapping in delivery/ |
| `python-engineer.md` | `Backend Engineer` (specialization) | (not present) | missing | technology specialization — prefer canonical mapping in delivery/ |
| `devops-engineer.md` | `DevOps Engineer` | (not present) | missing | |
| `ux-expert.md` | `UX Expert` | (not present) | missing | gate/review agent |
| `automation-tester.md` | `Automation Tester` | (not present) | missing | gate/review agent |
| `security-reviewer.md` | `Security Reviewer` | (not present) | missing | gate/review agent |
| `documentation-owner.md` | `Documentation Owner` | (not present) | missing | gate/review agent |
| `qa-reviewer.md` | `QA Reviewer` | (not present) | missing | gate/review agent |

## Coverage assessment

Claude mappings currently exist as descriptive guidance (in this file) rather than concrete adapter files under a `.claude/` directory. Update the table above if adapter files are added.

## Adapter guidance

- Keep canonical sequencing in `delivery/` rather than platform-only prose.
- When adding Claude adapter files, add a one-line `last-updated: YYYY-MM-DD` frontmatter to each adapter file and update this table's `Adapter path` and `Status` fields.

## Recommended next step

Decide whether to add a `.claude/` adapter directory with explicit adapter files. If not, keep this file as guidance and mark entries `missing` until adapters are available.
