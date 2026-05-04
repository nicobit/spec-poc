# Prompt: Create Path-Specific Instructions

Use this when you want `.github/instructions/*.instructions.md`.

```md
Create path-specific Copilot instructions for this repository.

Before writing:
- read `.project-setup/CONVENTIONS.md`
- adapt the matching templates under `.project-setup/templates/.github/instructions/`
- preserve the frontmatter shape:
  - `---`
  - `applyTo: "glob"`
  - `---`
- keep file names in lowercase kebab-case with the suffix `.instructions.md`

Pick only the files that are justified by the repository structure.

Possible candidates:
- `frontend.instructions.md`
- `backend.instructions.md`
- `testing.instructions.md`
- `docs.instructions.md`
- `database.instructions.md`
- `infrastructure.instructions.md`

For each selected file:
- define the file glob or folder scope it should apply to
- explain the purpose in one sentence
- write practical guidance for that area only
- include coding, validation, and change-safety rules that are specific to that slice
- avoid repeating the repository-wide instructions unless necessary

Also provide a short note explaining why any candidate file was omitted.
```
