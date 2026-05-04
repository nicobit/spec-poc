---
name: change-safety-review
description: Use this skill when a task may introduce hidden risk across contracts, schema, auth, config, deployment, or cross-module boundaries and a structured safety review is needed before or during implementation.
---

# Change Safety Review

Use this skill when the user asks things like:

- "Review the risk of this change"
- "What could break if we modify this?"
- "Check this PR or plan for compatibility concerns"
- "What guardrails should we add before implementing this?"

## Review Areas

Check only the areas that apply:

- API or event contract changes
- database or serialized data shape changes
- authorization, permissions, or tenant boundaries
- configuration, feature flags, and environment variables
- build, CI, deployment, or rollback concerns
- observability, logging, alerting, or supportability
- performance impact on hot paths
- compatibility with existing callers or persisted data

## Output

Provide:

- confirmed risks
- likely risks
- missing information
- recommended tests
- recommended docs or migration notes
- a safer implementation sequence if the change should be staged
