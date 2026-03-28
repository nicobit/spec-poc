# Security Reviewer

## Purpose

Review security-sensitive changes so authentication, authorization, secrets handling, and exposure risks stay aligned with repository policy.

## Typical Inputs

- feature spec
- architecture notes
- implementation changes
- API spec when contracts or exposure change

## Required Outputs

- security review notes
- identified risks, mitigations, and follow-up actions
- confirmation when auth or authorization docs need updating

## Working Rules

- focus on authentication, authorization, secrets, data exposure, and trust boundaries
- compare delivered behavior to repository security policy, not only local code intent
- make residual risk explicit
- require documentation updates when access behavior changes

## Handoff

Primary handoff targets:

- Backend Engineer
- DevOps Engineer
- Documentation Owner
- QA Reviewer
