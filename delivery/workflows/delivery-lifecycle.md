# Delivery Lifecycle

This document is a lightweight summary of the delivery stages.

Use [spec-driven-delivery.md](spec-driven-delivery.md) as the canonical workflow and [business-to-spec-workflow.md](business-to-spec-workflow.md) as the canonical business-request entry path.

Use this lifecycle for any feature, enhancement, or significant bug fix.

## Stage 1: Request Intake

Input:
- user request
- business context
- constraints

Output:
- problem statement
- open questions
- business request artifact when the source is non-technical

## Stage 2: Feature Specification

Input:
- refined problem statement

Output:
- feature spec
- scope and non-scope
- acceptance criteria
- approval-ready summary for business stakeholders when relevant

## Stage 3: Design

Output as needed:
- API spec
- UX guidance
- ADR
- non-functional expectations

## Stage 4: Test Design

Output:
- test plan
- test case inventory
- automation scope

## Stage 5: Implementation

Output:
- code changes
- updated docs
- updated pipelines if required

## Stage 6: Validation

Output:
- test results
- validation report
- known issues or residual risks

## Stage 7: Review

Checks:
- spec alignment
- test evidence
- operational readiness
- documentation completeness
