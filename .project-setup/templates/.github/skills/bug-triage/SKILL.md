---
name: bug-triage
description: Use this skill when the user wants to investigate, reproduce, classify, or route a bug report with consistent severity and ownership.
---

# Bug Triage

Use this skill when the user asks things like:

- "Triage this bug"
- "Help me reproduce this issue"
- "What area owns this regression?"
- "Turn this report into an actionable engineering task"

## Workflow

1. Restate the bug in observable terms.
2. Identify affected user flow, module, or service.
3. Reproduce using the smallest reliable path available.
4. Distinguish expected behavior from actual behavior.
5. Estimate severity and blast radius.
6. Suggest the likely owner area.
7. Recommend the next action:
   - fix now
   - gather more diagnostics
   - add regression test first
   - document known limitation

## Guardrails

- Do not guess root cause if evidence is weak; separate facts from hypotheses.
- Prefer minimal repro steps.
- Note missing logs, traces, screenshots, or test coverage when relevant.
- If the bug implies contract, schema, or security impact, call that out explicitly.
