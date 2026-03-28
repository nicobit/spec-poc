from __future__ import annotations

from pathlib import Path
import sys
import unittest


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

import repo_checks  # noqa: E402
import verify_pr_traceability  # noqa: E402
import verify_spec_changes  # noqa: E402


class RepositoryRulesTest(unittest.TestCase):
    def test_no_workspace_absolute_links(self) -> None:
        self.assertEqual(repo_checks.check_workspace_absolute_links(), [])

    def test_feature_packages_have_required_artifacts(self) -> None:
        self.assertEqual(repo_checks.check_feature_packages(), [])

    def test_pr_template_requires_spec_traceability(self) -> None:
        template = (ROOT / ".github" / "PULL_REQUEST_TEMPLATE.md").read_text(encoding="utf-8")
        self.assertIn("Feature ID:", template)
        self.assertIn("Spec Path:", template)
        self.assertIn("Test Plan Path:", template)

    def test_verify_pr_body_script_accepts_valid_traceability(self) -> None:
        body = "\n".join(
            [
                "Feature ID: FEAT-ADMIN-001",
                "Spec Path: specs/features/FEAT-ADMIN-001-user-directory/feature-spec.md",
                "Test Plan Path: specs/features/FEAT-ADMIN-001-user-directory/test-plan.md",
            ]
        )
        self.assertEqual(verify_pr_traceability.validate_pr_body(body), [])

    def test_verify_spec_changes_requires_spec_and_test_plan_for_code_changes(self) -> None:
        changed_files = [
            "frontend/src/App.tsx",
            "specs/features/FEAT-ADMIN-001-user-directory/feature-spec.md",
            "specs/features/FEAT-ADMIN-001-user-directory/test-plan.md",
        ]
        self.assertEqual(verify_spec_changes.validate_changed_files(changed_files), [])

    def test_verify_spec_changes_fails_without_spec_updates(self) -> None:
        changed_files = ["backend/function_dashboard/__init__.py"]
        errors = verify_spec_changes.validate_changed_files(changed_files)
        self.assertIn("Code changes detected but no feature-spec.md was updated.", errors)
        self.assertIn("Code changes detected but no test-plan.md was updated.", errors)


if __name__ == "__main__":
    unittest.main()
