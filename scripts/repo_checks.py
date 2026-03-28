from __future__ import annotations

from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_LINK_PATTERN = re.compile(r"\]\(/c:/Users/nicol/source/admin-portal/")
FEATURE_DIR_PATTERN = re.compile(r"^FEAT-[A-Z0-9]+-\d{3}(?:-[a-z0-9-]+)?$")
REQUIRED_FEATURE_FILES = (
    "feature-spec.md",
    "test-plan.md",
    "task-breakdown.md",
    "validation-report.md",
)


def iter_markdown_files() -> list[Path]:
    markdown_files: list[Path] = []
    for path in ROOT.rglob("*.md"):
        rel = path.relative_to(ROOT)
        if "node_modules" in rel.parts or "dist" in rel.parts:
            continue
        markdown_files.append(path)
    return markdown_files


def check_workspace_absolute_links() -> list[str]:
    errors: list[str] = []
    for path in iter_markdown_files():
        content = path.read_text(encoding="utf-8")
        if WORKSPACE_LINK_PATTERN.search(content):
            errors.append(
                f"{path.relative_to(ROOT)} contains workspace-absolute links; use relative GitHub-friendly links instead."
            )
    return errors


def iter_feature_packages() -> list[Path]:
    features_root = ROOT / "specs" / "features"
    if not features_root.exists():
        return []
    return sorted(path for path in features_root.iterdir() if path.is_dir())


def check_feature_packages() -> list[str]:
    errors: list[str] = []
    for package_dir in iter_feature_packages():
        if not FEATURE_DIR_PATTERN.match(package_dir.name):
            errors.append(
                f"{package_dir.relative_to(ROOT)} does not follow the FEAT-<id> naming convention."
            )
        for filename in REQUIRED_FEATURE_FILES:
            if not (package_dir / filename).exists():
                errors.append(
                    f"{package_dir.relative_to(ROOT)} is missing required artifact {filename}."
                )
        if (package_dir / "business-request.md").exists() and not (
            package_dir / "spec-refinement.md"
        ).exists():
            errors.append(
                f"{package_dir.relative_to(ROOT)} has business-request.md but is missing spec-refinement.md."
            )
    return errors


def run_all_checks() -> list[str]:
    return [*check_workspace_absolute_links(), *check_feature_packages()]


def main() -> int:
    errors = run_all_checks()
    if not errors:
        print("Repository checks passed.")
        return 0

    print("Repository checks failed:")
    for error in errors:
        print(f"- {error}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
