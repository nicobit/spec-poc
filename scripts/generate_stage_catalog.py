"""Generate a canonical specs/stages.json catalog from local Azurite table.

This script reads `__azurite_db_table__.json` and extracts client/environment/stage
records, producing a mapping keyed by `stage` with basic metadata and discovered
` schedules` and a placeholder for `azureResourceGroup`.

Usage: run from repo root:
    python scripts/generate_stage_catalog.py

This is a convenience helper; the generated file should be reviewed before committing.
"""
from pathlib import Path
import json
from collections import defaultdict

ROOT = Path(__file__).resolve().parents[1]
AZURITE = ROOT / '__azurite_db_table__.json'
OUT = ROOT / 'specs' / 'stages.json'

catalog = {}

if not AZURITE.exists():
    print('Azurite table not found:', AZURITE)
    raise SystemExit(1)

with AZURITE.open('r', encoding='utf-8') as fh:
    data = json.load(fh)

# Aggregate by (client, environment, stage)
agg = defaultdict(lambda: {'client': None, 'environment': None, 'schedules': set(), 'azureResourceGroup': None})

for rec in data:
    props = rec.get('properties') or {}
    client = props.get('client')
    env = props.get('environment')
    stage = props.get('stage') or props.get('stageId')
    schedule = props.get('scheduleId')

    if not stage:
        continue

    key = stage
    if client:
        agg[key]['client'] = client
    if env:
        agg[key]['environment'] = env
    if schedule:
        agg[key]['schedules'].add(schedule)

    # Heuristic: if a resourceGroup field present in other props, use it as resource group
    rg = props.get('resourceGroup') or props.get('rg')
    if rg:
        agg[key]['azureResourceGroup'] = rg

# Build catalog entries
for stage, info in agg.items():
    catalog[stage] = {
        'stage': stage,
        'client': info['client'],
        'environment': info['environment'],
        'schedules': sorted(list(info['schedules'])),
        'azureResourceGroup': info['azureResourceGroup'],
        'azureServices': [],
    }

OUT.parent.mkdir(parents=True, exist_ok=True)
with OUT.open('w', encoding='utf-8') as fh:
    json.dump(catalog, fh, indent=2)

print('Wrote', OUT)
