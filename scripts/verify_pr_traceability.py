from __future__ import annotations

import os
import re
import sys


FEATURE_ID_PATTERN = re.compile(r"Feature ID:\s*`?FEAT-[A-Z0-9]+-\d{3}")
SPEC_PATH_PATTERN = re.compile(r"Spec Path:\s*`?specs/features/.+/feature-spec\.md`?")
TEST_PLAN_PATH_PATTERN = re.compile(r"Test Plan Path:\s*`?specs/features/.+/test-plan\.md`?")


def validate_pr_body(pr_body: str) -> list[str]:
    errors: list[str] = []

    if not pr_body.strip():
        return ["PR body is empty. Include Feature ID, Spec Path, and Test Plan Path."]

    if not FEATURE_ID_PATTERN.search(pr_body):
        errors.append("PR body must include a Feature ID.")

    if not SPEC_PATH_PATTERN.search(pr_body):
        errors.append("PR body must include a valid Spec Path.")

    if not TEST_PLAN_PATH_PATTERN.search(pr_body):
        errors.append("PR body must include a valid Test Plan Path.")

    return errors


def main() -> int:
    pr_body = os.environ.get("PR_BODY", "")
    errors = validate_pr_body(pr_body)

    if not errors:
        print("PR body spec traceability check passed.")
        return 0

    for error in errors:
        print(f"ERROR: {error}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
