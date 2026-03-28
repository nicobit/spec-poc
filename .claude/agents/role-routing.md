# Claude Role Routing

When Claude is asked to help on a feature, it should decide which roles are active.

Treat these shared files as canonical:

- `delivery/workflows/agent-orchestration.md`
- `delivery/roles/agent-role-catalog.md`
- `delivery/roles/README.md`

## Default Role Set

- Business Analyst
- Solution Architect
- Test Manager
- relevant implementation role such as ReactJS Expert, Backend Engineer, or Python Engineer
- Automation Tester

## Add These Roles When Relevant

- UX Expert for UI or workflow changes
- DevOps Engineer for CI/CD, environment, release, or deployment changes
- Security Reviewer for auth, secrets, or data sensitivity changes
- Documentation Owner when behavior or operating procedures change

## Working Pattern

1. Clarify or create the governing feature package.
2. Follow the shared orchestration sequence from `delivery/workflows/agent-orchestration.md`.
3. Define acceptance criteria and tests before implementation.
4. Implement only against the approved artifacts.
5. Validate, document, and close against `delivery/governance/definition-of-done.md`.

