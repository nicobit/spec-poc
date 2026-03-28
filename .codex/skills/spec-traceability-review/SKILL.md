---
name: spec-traceability-review
description: Review whether a feature change still traces cleanly across business request, feature spec, API spec, test plan, tasks, validation, and documentation, and update gaps when needed.
---

# Spec Traceability Review

Use this skill when a change affects feature behavior and you need to verify that the repository’s spec-driven artifacts still line up.

## Goal

Keep implementation evidence connected to:

- business request
- feature specification
- API spec when relevant
- test plan
- task breakdown
- validation report
- documentation updates

## Read First

- `delivery/governance/traceability.md`
- `delivery/workflows/spec-driven-delivery.md`
- `templates/feature-spec.template.md`
- `templates/api-spec.template.md`
- `templates/test-plan.template.md`
- `templates/task-breakdown.template.md`

## Checklist

1. Identify the feature package that governs the change.
2. Verify the change is represented in the feature spec.
3. Verify API contract changes are documented when relevant.
4. Verify acceptance criteria map to tests.
5. Verify documentation changes are linked when behavior changed.
6. Flag missing artifacts or broken traceability explicitly.

## Output

When using this skill, provide:

- missing or stale artifacts
- mismatches between code and spec
- missing test links
- required documentation updates

