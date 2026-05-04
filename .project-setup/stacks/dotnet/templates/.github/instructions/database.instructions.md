---
applyTo: "src/**/*.cs,backend/**/*.cs,**/Migrations/**,**/*DbContext.cs,**/*EntityTypeConfiguration.cs"
---

# Database Instructions

- Treat schema and migration changes as compatibility-sensitive work, not local refactors.
- Keep entity shape, mapping configuration, and migration intent easy to review.
- Call out backward-compatibility, rollout, and rollback concerns for schema changes.
- Avoid hidden data shape changes inside unrelated feature work.
- If a migration is irreversible or operationally risky, say so explicitly.
- Add or update tests when persistence behavior changes.
