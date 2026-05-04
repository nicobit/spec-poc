# Rules For Adding New Copilot Artifacts

Use these rules before adding a new instruction file, skill, or custom agent.

## Add A New Artifact Only If

- there is a recurring problem not handled well by existing artifacts
- the new artifact has a clear purpose and audience
- the content will stay stable enough to maintain
- the team can explain when to use it in one or two sentences

## Prefer Updating Existing Artifacts If

- the new guidance is closely related to an existing file
- the new workflow is just a refinement of an existing skill
- the proposed new agent is only a narrower version of an existing one

## Thresholds

Use these as defaults unless the repo is unusually large:

- repo-wide instructions: exactly one
- path-specific instruction files: usually 2 to 5
- skills: usually 2 to 6
- custom agents: usually 0 to 4

If you exceed those numbers, document why.

## Rejection Rules

Reject a new artifact if:

- it duplicates another file
- it is just "technology guidance" that belongs in a path-specific instruction file
- it is too broad to trigger reliably
- it is too narrow to be reused
- it describes nonexistent tools or workflows

## Review Questions

Before merge, ask:

1. Why does this need a new file?
2. Why can this not live in an existing file?
3. Who will use this?
4. How will they know when to use it?
5. What prevents overlap with existing artifacts?
