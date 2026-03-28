#!/usr/bin/env python3
"""Local hook helper: ensure a feature spec exists for feature branches.

Usage: called from a git hook (pre-push) to prevent accidental pushes without a spec.
"""
import glob
import re
import subprocess
import sys


def current_branch():
    p = subprocess.run(["git", "rev-parse", "--abbrev-ref", "HEAD"], capture_output=True, text=True)
    if p.returncode != 0:
        print("Could not determine current branch")
        sys.exit(1)
    return p.stdout.strip()


def check_spec_for_feature(branch: str) -> bool:
    # Expect feature branches named: feature/<feature-id>-<short-name>
    m = re.match(r"feature/([a-zA-Z0-9._-]+)", branch)
    if not m:
        # Not a feature branch — do not block
        return True
    fid = m.group(1)
    pattern = f"specs/features/{fid}-*/feature-spec.md"
    matches = glob.glob(pattern)
    if matches:
        return True
    print(f"Missing feature spec for feature id '{fid}'. Expected file matching: {pattern}")
    return False


def main():
    branch = current_branch()
    ok = check_spec_for_feature(branch)
    if not ok:
        print("Push blocked: please add the feature spec under specs/features/<feature-id>-<short-name>/feature-spec.md before pushing.")
        sys.exit(2)
    print("Spec presence check passed.")


if __name__ == '__main__':
    main()
