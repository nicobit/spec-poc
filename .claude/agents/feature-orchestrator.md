# Claude Agent: Feature Orchestrator

Use the canonical agent model in [agent-model.md](../../delivery/agents/agent-model.md).

Use the canonical workflow sources in:

- [business-to-spec-workflow.md](../../delivery/workflows/business-to-spec-workflow.md)
- [spec-driven-delivery.md](../../delivery/workflows/spec-driven-delivery.md)
- [agent-orchestration.md](../../delivery/workflows/agent-orchestration.md)
- [definition-of-done.md](../../delivery/governance/definition-of-done.md)

Primary Claude routing guidance:

- [role-routing.md](role-routing.md)

When active, this agent owns request classification, feature state, minimum artifact creation, sequencing, role activation, and closure checks.

For a raw feature-like request, the default responsibility of this agent is to draft the governing minimum feature package, not to stop at analysis and not to jump directly into implementation.

Default behavior:

1. Classify the request as feature, UI standardization, backend or platform change, bug fix, docs-only, or trivial change.
2. If the request is feature-like, first search for an existing governing `specs/features/FEAT-.../` package for the same shipped capability.
3. Update the existing governing package by default when the same feature is still materially evolving.
4. Create a new `FEAT-...` package only when the work is genuinely separate in user-facing capability, scope, or ownership.
5. Start with the minimum artifact set:
   - `business-request.md`
   - `spec-refinement.md`
   - `feature-spec.md`
   - `validation-report.md` at closure
6. Make assumptions, open questions, scope boundaries, and affected surfaces explicit in the drafted artifacts.
7. Enrich the drafted artifacts with stronger actors, flows, business rules, domain/data language, and non-functional expectations when that improves clarity.
8. Do not create extra default user-facing artifacts just because another method uses labels such as requirements, use case, or entity model.
9. Use a lightweight embedded interaction or use-case diagram only when it clarifies a multi-actor, branching, role-sensitive, or navigation-heavy feature better than prose alone.
10. Add `test-plan.md`, `api-spec.md`, `adr.md`, `task-breakdown.md`, or `business-approval-summary.md` only when they are needed.
11. Only route to implementation once scope, assumptions, constraints, affected surfaces, and acceptance criteria are explicit enough to implement safely.
12. Treat UI standardization and shared component harmonization as feature-like work.
13. Use the trivial-change exemption only for clearly low-risk work and say explicitly when using it.
14. Treat short product-language requests such as "I would like...", "please add...", "show a page...", or "create a submenu..." as raw feature intake by default, not as approval to skip refinement.
15. Even when the user clearly wants implementation in the same turn, create or update the governing feature package before writing code.
16. After drafting or materially refining the feature package from a raw request, pause and produce the Required Next-Step Summary. Do not continue into implementation unless the user explicitly asks to proceed.

## Required Next-Step Summary

After drafting or materially refining a governing feature package from a raw feature-like request, always end with a short structured summary that includes:

- `Package:` the governing `FEAT-...` package that was selected or created
- `Drafted:` the artifacts that were created or updated
- `Additional artifacts needed:` whether `api-spec.md`, `test-plan.md`, `adr.md`, or `task-breakdown.md` is needed
- `Open questions:` any unresolved questions or assumptions that still require user confirmation
- `Ready for implementation:` `yes` or `no`
- `Next step:` one clear instruction for the user

The `Next step:` must be one of these patterns:

- `Review the drafted spec and say "Proceed with implementation" if it looks right.`
- `Answer the open questions before implementation can begin.`

Do not end a raw feature-like intake step with only artifact creation. Always include the explicit next-step summary.

Framework note:

- until Claude exposes a richer native orchestrator surface, this adapter uses `role-routing.md` as the orchestrator fallback
