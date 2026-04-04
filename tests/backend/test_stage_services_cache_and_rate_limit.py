import importlib.util
import importlib
import os
import sys
import json
import time
from pathlib import Path


def _load_module_with_env(env: dict):
    # Set env vars for the import
    old_env = os.environ.copy()
    os.environ.update(env)
    try:
        module_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'backend', 'app', 'services', 'azure_stage_services.py'))
        spec = importlib.util.spec_from_file_location('azure_stage_services', module_path)
        mod = importlib.util.module_from_spec(spec)
        sys.modules['azure_stage_services'] = mod
        spec.loader.exec_module(mod)
        return mod
    finally:
        os.environ.clear()
        os.environ.update(old_env)


def test_cache_prevents_reread(tmp_path):
    env = {
        'STAGE_SERVICES_CACHE_TTL': '60',
        'STAGE_SERVICES_CACHE_TTL_REALTIME': '0',
    }
    mod = _load_module_with_env(env)

    # prepare specs/stages.json under repository root (module resolves relative to file)
    specs_path = Path(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'specs', 'stages.json')))
    orig_exists = specs_path.exists()
    backup = None
    if orig_exists:
        backup = specs_path.read_text(encoding='utf-8')

    try:
        specs_path.parent.mkdir(parents=True, exist_ok=True)
        specs_path.write_text(json.dumps({'test-stage': {'azureServices': [{'name': 'svc1'}]}}), encoding='utf-8')

        # clear internal caches
        mod._CACHE.clear()
        mod._LIMITERS.clear()

        r1 = mod.get_stage_services('test-stage', realtime=False)
        assert r1['services'] and r1['services'][0]['name'] == 'svc1'

        # change the specs file to a different value
        specs_path.write_text(json.dumps({'test-stage': {'azureServices': [{'name': 'svc2'}]}}), encoding='utf-8')

        # immediate second call should return cached (svc1) because TTL is active
        r2 = mod.get_stage_services('test-stage', realtime=False)
        assert r2['services'][0]['name'] == 'svc1'

    finally:
        # restore
        if backup is not None:
            specs_path.write_text(backup, encoding='utf-8')
        elif specs_path.exists():
            specs_path.unlink()


def test_realtime_rate_limit_triggers(tmp_path):
    # configure very low rate and zero realtime cache to force limiter behavior
    env = {
        'RATE_LIMIT_RATE_REALTIME': '0.001',
        'RATE_LIMIT_BURST_REALTIME': '1',
        'STAGE_SERVICES_CACHE_TTL_REALTIME': '0',
        'RATE_LIMIT_RATE_FALLBACK': '0.001',
        'RATE_LIMIT_BURST_FALLBACK': '1',
    }
    mod = _load_module_with_env(env)

    # ensure no specs file (catalog) interferes
    specs_path = Path(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'specs', 'stages.json')))
    orig_exists = specs_path.exists()
    backup = None
    if orig_exists:
        backup = specs_path.read_text(encoding='utf-8')
        specs_path.unlink()

    try:
        mod._CACHE.clear()
        mod._LIMITERS.clear()

        # first call should attempt a realtime lookup (may return empty but not rateLimited)
        res1 = mod.get_stage_services('nonexistent-stage', realtime=True)
        assert isinstance(res1, dict)

        # immediate second call should be rate-limited (due to low burst)
        res2 = mod.get_stage_services('nonexistent-stage', realtime=True)
        assert 'rateLimited' in res2 and res2['rateLimited'] is True
        assert 'retryAfterSeconds' in res2

    finally:
        if backup is not None:
            specs_path.write_text(backup, encoding='utf-8')
