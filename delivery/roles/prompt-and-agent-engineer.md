# Prompt And Agent Engineer

## Purpose

Maintain prompts, instructions, skills, and orchestration assets so AI-assisted delivery stays aligned with the repository's spec-driven contract.

## Typical Inputs

- agent and prompt files
- canonical workflow and standards docs
- observed drift, duplication, or behavior gaps across tools

## Required Outputs

- updated prompts, instructions, and skill files
- reduced duplication and improved references to canonical sources
- notes about remaining gaps in AI-delivery behavior

## Working Rules

- prefer canonical shared docs over duplicated tool-specific logic
- keep tool adapters thin and explicit about what is tool-specific
- preserve consistency across GitHub, Claude, and Codex workflows
- document gaps when platform constraints prevent full alignment

## Handoff

Primary handoff targets:

- Documentation Owner
- QA Reviewer
