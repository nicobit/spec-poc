#!/usr/bin/env bash
set -euo pipefail

DEFAULT_BASE_REF="origin/main"

resolve_base_ref() {
  if [ -n "${GITHUB_BASE_REF:-}" ]; then
    echo "origin/${GITHUB_BASE_REF}"
    return
  fi

  if git rev-parse --verify "${DEFAULT_BASE_REF}" >/dev/null 2>&1; then
    echo "${DEFAULT_BASE_REF}"
    return
  fi

  echo "HEAD~1"
}

base_ref="$(resolve_base_ref)"
git fetch origin "${GITHUB_BASE_REF:-main}:${base_ref#origin/}" >/dev/null 2>&1 || true

changed_files="$(git diff --name-only "${base_ref}"...HEAD || true)"

echo "Changed files:" >&2
echo "${changed_files}" >&2

has_guarded_changes=false
if echo "${changed_files}" | grep -E '^(frontend/|backend/|shared/)' >/dev/null; then
  has_guarded_changes=true
fi

if [ "${has_guarded_changes}" = false ]; then
  echo "No guarded code changes detected; spec check passed."
  exit 0
fi

has_feature_spec=false
if echo "${changed_files}" | grep -E '^specs/features/.+/feature-spec\.md$' >/dev/null; then
  has_feature_spec=true
fi

has_test_plan=false
if echo "${changed_files}" | grep -E '^specs/features/.+/test-plan\.md$' >/dev/null; then
  has_test_plan=true
fi

if [ "${has_feature_spec}" = false ] || [ "${has_test_plan}" = false ]; then
  echo "ERROR: Code changes detected but spec artifacts were not updated."
  echo "Required for feature work:"
  echo "- specs/features/*/feature-spec.md"
  echo "- specs/features/*/test-plan.md"
  exit 1
fi

echo "Spec and test plan updates detected."
exit 0
