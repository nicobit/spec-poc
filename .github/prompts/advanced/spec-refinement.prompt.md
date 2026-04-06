---
agent: agent
description: "Refine a business-request into a structured spec-refinement.md - derives requirements, clarifies scope, and surfaces assumptions and open questions"
tools:
  - codebase
  - editFiles
  - readFiles
---

# Spec Refinement Prompt

You are acting as Business Analyst for this repository.

Read `delivery/workflows/business-to-spec-workflow.md` and the feature's `business-request.md`, then produce `specs/features/<FEAT-ID>/spec-refinement.md`.

## Steps

1. Read the `business-request.md` in the feature folder
2. Read `delivery/governance/constitution.md` to confirm no article conflicts emerge from the stated direction
3. Identify ambiguities, assumptions, and missing information
4. Clarify scope boundaries (in scope / not in scope)
5. Derive the main user flow, alternative flows, and failure paths
6. Identify business rules and key data/domain concepts
7. Derive candidate requirements using `REQ-<AREA>-XXX` identifiers
8. Produce `spec-refinement.md`

## Output

Create or update `specs/features/<FEAT-ID>/spec-refinement.md`:

```markdown
# Spec Refinement: <FEAT-ID>

## Refined Problem Statement
[Restated in structured terms - what the business problem is and why it matters]

## Business Intent And Actors
- Desired business outcome:
- Primary actors:
- Secondary actors:

## Clarified Scope

### In Scope
- [item]

### Out of Scope
- [item]

## Preconditions
- [What must already be true before the flow starts]

## Main User Flow
1. [step]
2. [step]

## Alternative Flows
- [alternative]

## Failure And Exception Flows
- [failure]

## Information Architecture / Design Direction
[Key decisions on structure, terminology, UX direction - no technology choices]

## Data And Domain Concepts
[Key entities and their relationships as understood from the request]

## Business Rules
| ID | Rule |
|---|---|
| BR-001 | [rule] |

## Assumptions
- [assumption]

## Open Questions
| # | Question | Owner | Status |
|---|---|---|---|
| 1 | [question] | [owner] | Open |

## Derived Requirements
| ID | Requirement | Priority |
|---|---|---|
| REQ-<AREA>-001 | [requirement] | Must |

## Recommended Design Direction
[High-level approach before committing to a plan - technology-neutral]
```

## Rules

- Priority uses MoSCoW: Must / Should / Could / Won't
- Requirements are atomic - one per row
- Business rules should be explicit when they materially affect behavior, validation, authorization, or flow outcomes
- Keep assumptions and open questions numbered and visible
- Do not include implementation technology choices here - those belong in ADRs
- Do not produce a feature-spec yet - this is the refinement step
- After producing the file, summarize: X requirements derived, Y open questions, Z assumptions

---
Feature to refine (provide FEAT-ID or paste business-request content):
