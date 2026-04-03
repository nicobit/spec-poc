---
applyTo: "specs/**/*.md"
---

When editing specification artifacts:

- treat specifications as source-of-truth delivery artifacts, not lightweight notes
- preserve stable identifiers for features, requirements, acceptance criteria, APIs, tests, and ADRs
- separate confirmed facts, assumptions, and open questions
- keep traceability visible from requirements to tests and validation
- use the templates in `/templates` when adding new feature artifacts
- prefer feature-package conventions under `specs/features/FEAT-<area>-<id>-<short-name>/`
- when a shipped feature is still materially evolving, update the existing governing `FEAT-...` package unless the new work is genuinely separate in scope or user-facing capability
