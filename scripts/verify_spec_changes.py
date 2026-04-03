from __future__ import annotations

import subprocess
import sys


GUARDED_PREFIXES = ("frontend/", "backend/", "shared/")


def get_changed_files(base_ref: str) -> list[str]:
    result = subprocess.run(
        ["git", "diff", "--name-only", f"{base_ref}...HEAD"],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        return []
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def validate_changed_files(changed_files: list[str]) -> list[str]:
    has_guarded_changes = any(path.startswith(GUARDED_PREFIXES) for path in changed_files)
    if not has_guarded_changes:
        return []

    has_feature_spec = any(
        path.startswith("specs/features/") and path.endswith("/feature-spec.md")
        for path in changed_files
    )
    has_test_plan = any(
        path.startswith("specs/features/") and path.endswith("/test-plan.md")
        for path in changed_files
    )
    has_validation_report = any(
        path.startswith("specs/features/") and path.endswith("/validation-report.md")
        for path in changed_files
    )

    errors: list[str] = []
    if not has_feature_spec:
        errors.append("Code changes detected but no feature-spec.md was updated.")
    if not has_test_plan:
        errors.append("Code changes detected but no test-plan.md was updated.")
    if not has_validation_report:
        errors.append("Code changes detected but no validation-report.md was updated.")
    return errors


def main() -> int:
    base_ref = sys.argv[1] if len(sys.argv) > 1 else "origin/main"
    changed_files = get_changed_files(base_ref)
    errors = validate_changed_files(changed_files)

    if not errors:
        print("Spec change traceability check passed.")
        return 0

    for error in errors:
        print(f"ERROR: {error}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
