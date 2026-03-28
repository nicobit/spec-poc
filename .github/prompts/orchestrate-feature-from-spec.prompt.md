# Orchestrate Feature From Spec

Use this prompt when you want GitHub Copilot to start from one feature package and drive the repository workflow sequentially.

```text
Use the Feature Orchestrator agent.

Start from this feature package:
specs/features/FEAT-...-.../

Read:
1. delivery/workflows/spec-driven-delivery.md
2. delivery/workflows/copilot-agent-routing.md
3. delivery/governance/traceability.md
4. the feature package artifacts

Then:
1. assess which phases are already complete and which need updates
2. identify the active roles needed for this change
3. run the repository sequence in order instead of jumping straight to code
4. update specs, tests, docs, and validation artifacts as needed
5. if auth or permissions changed, also update:
   - docs/standards/security/access-control-matrix.md
   - docs/standards/security/module-authorization.md
6. before finishing, perform a traceability review

Do not silently skip missing phases.
Call out assumptions, open questions, and remaining gaps explicitly.
```


