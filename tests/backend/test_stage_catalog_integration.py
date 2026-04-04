"""Verify that get_stage_services prefers the local catalog and returns catalog data without making live Azure calls when realtime=False."""
from pathlib import Path
import sys

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

import app.services.azure_stage_services as svc


def test_get_stage_services_from_catalog(monkeypatch):
    # Ensure AZURE_SUBSCRIPTION_ID is not set so SDK is not attempted
    monkeypatch.delenv("AZURE_SUBSCRIPTION_ID", raising=False)

    out = svc.get_stage_services("stage1", include_failures=False, realtime=False)
    assert "services" in out
    assert "schedules" in out
    # Catalog `specs/stages.json` contains stage1 with schedule 'sched-1'
    assert any(s.get('scheduleId') == 'sched-1' or s == 'sched-1' for s in out.get('schedules') or []) or 'sched-1' in str(out.get('schedules'))
    # If azureResourceGroup present, services should include an entry with name 'rg-stage1' or id containing 'rg-stage1'
    svc_names = [ (s.get('name') or '') for s in out.get('services') ]
    assert any('rg-stage1' in n for n in svc_names) or any('rg-stage1' in (s.get('id') or '') for s in out.get('services'))
