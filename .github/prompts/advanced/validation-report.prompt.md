---
agent: agent
description: "Generate a validation-report.md with traceability matrix and definition-of-done checklist — records evidence, gaps, and residual risks at feature closure"
tools:
  - codebase
  - editFiles
  - readFiles
---

# Validation Report Prompt

You are acting as Test Manager and QA Reviewer for this repository.

Read the feature spec, test plan, and implementation state, then produce `specs/features/<FEAT-ID>/validation-report.md`.

## Steps

1. Read `delivery/governance/definition-of-done.md`
2. Read `delivery/governance/traceability.md`
3. Read `specs/features/<FEAT-ID>/feature-spec.md` — extract all acceptance criteria
4. Read `specs/features/<FEAT-ID>/test-plan.md` if it exists
5. Assess implementation and test evidence
6. Produce or update `validation-report.md`

## Output

Create or update `specs/features/<FEAT-ID>/validation-report.md`:

```markdown
# Validation Report: <FEAT-ID> <Short Name>

**Status**: In Progress | Passed | Passed with Conditions | Failed
**Validated**: <date>

## Traceability Matrix

| Requirement | Acceptance Criterion | Test Case | Result | Notes |
|---|---|---|---|---|
| REQ-<AREA>-001 | AC-<AREA>-001 | TC-<AREA>-001 | Pass / Fail / Partial | |

## Definition of Done Checklist

### Specification
- [ ] Feature spec present and understandable
- [ ] Scope and non-scope documented
- [ ] Assumptions and open questions visible

### Design
- [ ] API changes documented (if applicable)
- [ ] Architecture decisions recorded (if applicable)
- [ ] Durable architecture views updated (if structure changed)

### Testing
- [ ] Acceptance criteria mapped to tests
- [ ] Automated tests added or updated at appropriate layers
- [ ] Regression coverage exists for delivered behavior

### Implementation
- [ ] Code aligns with approved spec
- [ ] Backend changes preserve portability (Article V)
- [ ] Frontend reflects UX and accessibility expectations

### Operations
- [ ] CI/CD updates included if delivery flow affected
- [ ] Security implications reviewed
- [ ] Secrets and credentials reviewed (Article VI)

### Documentation
- [ ] Repository documentation updated
- [ ] Validation evidence recorded
- [ ] Authorization docs updated if access control changed (Article IV)

## Known Gaps and Residual Risks
| # | Gap / Risk | Owner | Due Date |
|---|---|---|---|
| 1 | [gap or risk] | [owner] | [date] |

## Sign-Off Notes
[Notes from the reviewer on what was checked, what was deferred, and why status is set as it is]
```

## Rules

- Every `AC-xxx` in the feature spec must appear in the traceability matrix
- Result must be Pass, Fail, or Partial — not "TBD" at sign-off
- Known gaps must have owners and due dates before status can be `Passed`
- Do not mark spec status `Completed` unless the full definition-of-done checklist is satisfied
- After producing the file, state clearly: what passed, what failed, and what is deferred

---
Feature to validate (provide FEAT-ID):
