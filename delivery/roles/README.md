# Shared Role Definitions

These files are the canonical role definitions for the repository.

They are tool-neutral and should be treated as the source of truth for:

- role purpose
- inputs
- outputs
- working rules
- handoff expectations

Tool-specific adapters should reference these files instead of redefining the roles independently.

Where both a generic and a language-specific role exist, prefer the more concrete implementation role for active delivery. In this repository, `python-engineer.md` is usually the primary backend implementation role, while `backend-engineer.md` is a broader generic reference.

Not every role is part of the default delivery path. Some role files are niche or framework-maintenance references and should be used only when the task specifically matches their scope.
