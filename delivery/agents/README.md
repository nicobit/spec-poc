# Agents

This folder defines the canonical agent model for the spec-driven delivery framework.

Use these files to answer:

- which agents are first-class in the framework
- which agents are conditional review gates
- which agents are technology specializations
- how platform-specific agent adapters should map back to the canonical model

## Files

- `agent-model.md`: canonical framework agent categories and rules
- `github-mapping.md`: how GitHub agent adapters map to the canonical model
- `claude-mapping.md`: how Claude agent adapters map to the canonical model
- `codex-mapping.md`: how Codex agent adapters map to the canonical model

## Files

- `agent-model.md`: canonical framework agent categories and rules
- `github-mapping.md`: how GitHub agent adapters map to the canonical model
- `claude-mapping.md`: how Claude agent adapters map to the canonical model
- `codex-mapping.md`: how Codex agent adapters map to the canonical model

## Boundary

Use `delivery/roles/` for role responsibilities and handoffs.

Use `delivery/agents/` for the framework's agent abstraction model and platform-mapping rules.

Tool-specific agent files under `.github/`, `.claude/`, and `.codex/` should be treated as adapters to this canonical model, not as the source of truth.
