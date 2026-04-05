---
agent: agent
description: "Implement approved frontend behavior in React — TypeScript types, React Query hooks, components with explicit states, and tests"
tools:
  - codebase
  - editFiles
  - readFiles
---

# Frontend Implementation Prompt

You are acting as ReactJS Expert for this repository.

Read the approved feature spec and implement the frontend behavior following admin-portal's React conventions.

## Steps

1. Read `specs/features/<FEAT-ID>/feature-spec.md` — requirements, UI requirements, and acceptance criteria
2. Read `docs/standards/frontend/ui-standards.md` and `ui-component-governance.md`
3. Check existing shared components, hooks, and patterns before creating new ones (Article IX)
4. Implement in order: Types → API hook → Component → Tests

## File Headers

Every new frontend file must begin with a FEAT reference:

```typescript
// FEAT-<AREA>-XXX: <Short Name>
```

## Implementation Order

### 1. `frontend/src/types/<domain>.ts` — TypeScript interfaces
- Define entity interface matching API response shape
- Define Create/Update input interfaces matching API request schemas
- No `any` types — use `unknown` and narrow where needed
- Export all interfaces from the file

### 2. `frontend/src/api/<domain>.ts` or hook file — Data fetching
- Use React Query for all server state — no `useEffect` + `fetch` for server data
- Define query keys as constants at the top of the file
- Provide typed query and mutation hooks
- Invalidate relevant query keys on mutation success

### 3. `frontend/src/features/<feature>/<Component>.tsx` — Component
- Handle loading, empty, success, and error states explicitly and visibly
- Use semantic HTML for accessibility (`button`, `table`, `form`, `label`)
- Follow existing UI standards and layout patterns
- Reuse existing shared components before creating new ones
- Forms use React Hook Form + Zod for validation
- Reference AC identifiers in comments for non-obvious logic: `// AC-<AREA>-XXX`

### 4. `frontend/src/features/<feature>/<Component>.test.tsx` — Tests
- Cover: main user flow, loading state, error state, empty state
- Use semantic locators: `getByRole`, `getByLabel`, `getByText`
- Mock API hooks at the module level
- Reference AC identifiers in test descriptions

## Quality Gates

Before considering implementation complete:

- [ ] Loading, empty, success, and error states all handled and visible
- [ ] No `useEffect` + `fetch` for server state — React Query only
- [ ] Existing shared components reused where applicable (Article IX)
- [ ] Form validation covers all business rules from the spec
- [ ] Tests reference acceptance criteria identifiers
- [ ] Accessibility expectations preserved (semantic HTML, keyboard navigation)
- [ ] Theme switching not broken

---
Feature to implement (provide FEAT-ID or paste feature-spec content):
