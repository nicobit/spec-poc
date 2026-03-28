# GitHub Agent Mapping

This document maps the GitHub Copilot agent layer to the canonical framework agent model.

Use it together with:

- `agent-model.md`
- `../roles/agent-role-catalog.md`
- `../workflows/agent-orchestration.md`

## Mapping Summary

| GitHub Agent | Canonical Agent | Status | Notes |
| --- | --- | --- | --- |
| `Feature Orchestrator` | `Feature Orchestrator` | direct | strongest current framework-aligned adapter |
| `Business Analyst` | `Business Analyst` | direct | aligned |
| `Solution Architect` | `Solution Architect` | direct | aligned |
| `Test Manager` | `Test Manager` | direct | aligned |
| `ReactJS Expert` | `Frontend Engineer` | specialization | technology-specific frontend specialization |
| `Python Engineer` | `Backend Engineer` | specialization | technology-specific backend specialization |
| `DevOps Engineer` | `DevOps Engineer` | direct | aligned |
| `UX Expert` | `UX Expert` | direct | gate/review agent |
| `Automation Tester` | `Automation Tester` | direct | gate/review agent |
| `Security Reviewer` | `Security Reviewer` | direct | gate/review agent |
| `Documentation Owner` | `Documentation Owner` | direct | gate/review agent |

## Coverage Assessment

GitHub currently has the best alignment with the canonical framework because it provides:

- an explicit orchestrator adapter
- the full core sequence except for generic `Frontend Engineer` and `Backend Engineer`
- direct gate/review agents for UX, automation, security, and documentation

## Gaps

GitHub still expresses implementation through technology-specialized agent names:

- `ReactJS Expert` instead of `Frontend Engineer`
- `Python Engineer` instead of `Backend Engineer`

This is acceptable as a platform adapter, but the canonical orchestration logic should continue to use the framework-level names.

## Adapter Rule

When updating GitHub agents:

1. preserve `Feature Orchestrator` as the primary sequential entrypoint
2. keep GitHub-only behavior limited to tool scopes and GitHub-specific agent syntax
3. map new GitHub agents back to a canonical agent before introducing them

## Recommended Next Step

Optionally add explicit notes in GitHub agent files that they are specializations of canonical framework agents where applicable.
