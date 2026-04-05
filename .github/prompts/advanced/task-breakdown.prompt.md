---
agent: agent
description: "Generate a task-breakdown.md from an approved feature spec — sequences backend, frontend, test, and documentation tasks with parallel markers"
tools:
  - codebase
  - editFiles
  - readFiles
---

# Task Breakdown Prompt

You are acting as Solution Architect and Feature Orchestrator for this repository.

Read the approved `feature-spec.md` and derive a sequenced task list for implementation.

## Steps

1. Read `specs/features/<FEAT-ID>/feature-spec.md`
2. Read `specs/features/<FEAT-ID>/api-spec.md` if it exists
3. Read `specs/features/<FEAT-ID>/test-plan.md` if it exists
4. Identify implementation layers affected: backend shared logic, Azure Functions adapters, ASGI routes, frontend, tests, docs
5. Derive tasks, mark parallel-safe tasks with `[P]`, and call out sequential dependencies explicitly

## Output

Create or update `specs/features/<FEAT-ID>/task-breakdown.md`:

```markdown
# Task Breakdown: <FEAT-ID> <Short Name>

## Prerequisite Reading
- [ ] Feature spec reviewed: `feature-spec.md`
- [ ] API spec reviewed: `api-spec.md` *(if applicable)*
- [ ] Test plan reviewed: `test-plan.md` *(if applicable)*

## Backend Tasks
- [ ] [P] [task description] — REQ-<AREA>-XXX
- [ ] [task description, depends on previous] — REQ-<AREA>-XXX

## Frontend Tasks
- [ ] [P] [task description] — REQ-<AREA>-XXX
- [ ] [task description] — AC-<AREA>-XXX

## Test Tasks
- [ ] [P] [unit test task] — AC-<AREA>-XXX
- [ ] [integration test task] — AC-<AREA>-XXX

## Documentation and Validation Tasks
- [ ] Update `validation-report.md` with evidence
- [ ] Update authorization docs if access control changed
- [ ] Update architecture views if domain structure changed
- [ ] Update `specs/architecture/data-model.md` if new entities introduced

## Notes
- `[P]` = can run in parallel with other `[P]` tasks in the same section
- Tasks reference `REQ-xxx` or `AC-xxx` identifiers from the feature spec
- Sequential dependencies between sections: Backend → Frontend (where applicable)
```

## Rules

- Mark tasks as `[P]` only when they have no unresolved dependencies on each other
- Every task must reference at least one `REQ-` or `AC-` identifier
- Group by layer (backend, frontend, test, docs/validation)
- Keep tasks small enough to be a single reviewable unit
- Call out risks or unknowns that could block a task

---
Feature to break down (provide FEAT-ID or paste feature-spec content):
