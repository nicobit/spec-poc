# Agent Orchestration

This document defines the recommended role sequence for turning a request into a delivered feature.

## Business-Originated Request Flow

1. Business Analyst
   - refines the request
   - drafts the feature specification
   - captures assumptions and open questions
2. Product Owner
   - confirms business priority and intent
   - approves the refined scope
3. Solution Architect
   - defines solution boundaries and required design artifacts
4. UX Expert
   - defines journeys, interaction expectations, and accessibility constraints when UI is involved
5. Test Manager
   - derives acceptance-to-test coverage and validation strategy
6. ReactJS Expert, Backend Engineer, and or Python Engineer
   - implement the approved design
7. Automation Tester
   - adds or updates automated test coverage
8. DevOps Engineer
   - updates CI/CD, release automation, or environment delivery where required
9. QA Reviewer and Documentation Owner
   - confirm validation and repo/documentation completeness

## Minimal Orchestration Rule

For a simple business request, the minimum recommended sequence is:

1. Business Analyst
2. Architect
3. Test Manager
4. Implementation role
5. Automation Tester
6. DevOps Engineer if pipeline or release concerns are affected

## Handoff Principle

Each role should consume approved artifacts from the previous step, not reinterpret the original request independently.

This reduces drift between business intent, implementation, and validation.
