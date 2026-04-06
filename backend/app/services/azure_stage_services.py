"""Helper to resolve Azure services and execution history for a stage.

Reads stage definitions from the configured catalog store (Azure Storage Table,
Cosmos DB, or specs/stages.json as a dev fallback) via the catalog provider
from shared.catalog_repository.

Public API:
- get_stage_services(stage_id, include_failures, lookback_days, realtime) -> dict

Caching and rate-limiting are applied to reduce Azure SDK call frequency.
"""
from __future__ import annotations

from typing import Any, Dict, List
from datetime import datetime, timedelta, timezone
import os
import logging
import threading
import time
import copy
import math

from azure.identity import DefaultAzureCredential
from azure.mgmt.resource import ResourceManagementClient

_log = logging.getLogger(__name__)

# Simple in-memory TTL cache to reduce repeated Azure calls and table scans.
# Controlled via env vars:
# - STAGE_SERVICES_CACHE_TTL (seconds) for catalog/fallback results (default 300)
# - STAGE_SERVICES_CACHE_TTL_REALTIME (seconds) for realtime results (default 30)
_CACHE: Dict[str, Dict[str, Any]] = {}
_CACHE_LOCK = threading.Lock()
_DEFAULT_TTL = int(os.environ.get('STAGE_SERVICES_CACHE_TTL', '300'))
_DEFAULT_TTL_REALTIME = int(os.environ.get('STAGE_SERVICES_CACHE_TTL_REALTIME', '30'))

# Simple token-bucket rate limiters keyed by operation (e.g., realtime per-stage)
# Env vars control rates and burst sizes.
_RATE_REALTIME = float(os.environ.get('RATE_LIMIT_RATE_REALTIME', '0.05'))  # tokens/sec (default ~1 per 20s)
_BURST_REALTIME = float(os.environ.get('RATE_LIMIT_BURST_REALTIME', '2'))
_RATE_FALLBACK = float(os.environ.get('RATE_LIMIT_RATE_FALLBACK', '0.2'))  # tokens/sec (default ~1 per 5s)
_BURST_FALLBACK = float(os.environ.get('RATE_LIMIT_BURST_FALLBACK', '5'))

_LIMITERS: Dict[str, Dict[str, float]] = {}
_LIMITERS_LOCK = threading.Lock()


def _consume_token(key: str, rate: float, burst: float) -> tuple[bool, float]:
    """Attempt to consume one token from a token-bucket limiter.

    Returns (allowed: bool, retry_after_seconds: float).
    """
    now = time.time()
    with _LIMITERS_LOCK:
        entry = _LIMITERS.get(key)
        if not entry:
            # initialize
            _LIMITERS[key] = {'tokens': burst - 1.0, 'last': now}
            return True, 0.0

        tokens = entry.get('tokens', 0.0)
        last = entry.get('last', now)
        # refill
        elapsed = now - last
        tokens = min(burst, tokens + elapsed * rate)
        if tokens >= 1.0:
            tokens -= 1.0
            _LIMITERS[key] = {'tokens': tokens, 'last': now}
            return True, 0.0
        else:
            # compute time until one token available
            needed = 1.0 - tokens
            retry_after = needed / rate if rate > 0 else float('inf')
            _LIMITERS[key] = {'tokens': tokens, 'last': now}
            return False, math.ceil(retry_after)


def _safe_prop(obj, *keys):
    try:
        cur = obj
        for k in keys:
            cur = cur.get(k) if isinstance(cur, dict) else getattr(cur, k)
        return cur
    except Exception:
        return None


def _resource_action_to_service(ra: Dict[str, Any]) -> Dict[str, Any]:
    """Map a stage resourceAction entry to the services dict shape."""
    ra_type = ra.get("type", "")
    name = (
        ra.get("serverName")       # sql-vm
        or ra.get("workspaceName") # synapse-sql-pool
        or ra.get("instanceName")  # sql-managed-instance
        or ra.get("namespace")     # service-bus-message
        or ra.get("name")
        or ra.get("id")
        or ra_type
    )
    rg = ra.get("resourceGroup", "")
    sub = ra.get("subscriptionId", "") or os.environ.get("AZURE_SUBSCRIPTION_ID", "")
    ra_id = ra.get("id", "")
    if rg and not ra_id.startswith("/"):
        resource_id = f"/subscriptions/{sub}/resourceGroups/{rg}"
    else:
        resource_id = ra_id
    return {
        "type": ra_type,
        "id": resource_id,
        "name": name,
        "region": ra.get("region") or ra.get("location"),
        "status": "Unknown",
        "resourceGroup": rg,
        "subscriptionId": sub,
    }


def get_stage_services(stage_id: str, include_failures: bool = True, lookback_days: int = 7, realtime: bool = False) -> Dict[str, Any]:
    """Return services and recent execution history for the given stage.

    Data sources (in priority order):
    1. Catalog provider (Storage Table → Cosmos DB → file fallback) for stage definition
    2. Azure Resource Manager (realtime=True only) for live resource state
    3. Catalog provider for execution history (schedules and recent failures)

    Results are cached using a TTL-based in-memory cache.
    Realtime Azure SDK calls are rate-limited per stage via a token-bucket limiter.
    """
    services: List[Dict[str, Any]] = []

    # Check cache first
    cache_key = f"{stage_id}|realtime={bool(realtime)}|failures={bool(include_failures)}|lookback={int(lookback_days)}"
    now_ts = time.time()
    with _CACHE_LOCK:
        cached = _CACHE.get(cache_key)
        if cached and cached.get('expires_at', 0) > now_ts:
            try:
                return copy.deepcopy(cached['value'])
            except Exception:
                # fall through to recompute
                pass

    # Resolve stage definition from the catalog store (Storage Table / Cosmos / file).
    # Lazy import keeps this module testable without backend/ on sys.path at load time.
    schedules: List[Dict[str, Any]] = []
    stage_entry: Dict[str, Any] = {}
    provider = None
    try:
        from shared.catalog_repository import get_catalog_provider  # lazy import
        provider = get_catalog_provider()
        stage_entry = provider.get_stage(stage_id) or {}
    except Exception as exc:
        _log.debug("catalog provider unavailable: %s", exc)

    if stage_entry:
        # Storage-table format: the stage has resourceActions
        if stage_entry.get("resourceActions"):
            services = [_resource_action_to_service(ra) for ra in stage_entry["resourceActions"]]
        # Legacy file format: explicit azureServices list
        elif stage_entry.get("azureServices"):
            services = list(stage_entry.get("azureServices", []))
        # Legacy file format: single resourceGroup hint
        elif stage_entry.get("azureResourceGroup"):
            rg = stage_entry["azureResourceGroup"]
            services = [{
                "type": "ResourceGroup",
                "id": f'/subscriptions/{os.environ.get("AZURE_SUBSCRIPTION_ID", "")}/resourceGroups/{rg}',
                "name": rg,
                "region": stage_entry.get("region"),
                "status": "Unknown",
            }]
        # Legacy file format: schedules embedded in the stage entry
        if stage_entry.get("schedules"):
            schedules = list(stage_entry["schedules"])

    # Attempt Azure SDK lookup only when realtime=True.
    # The rate limiter is applied to all realtime calls regardless of subscription config —
    # this prevents call storms even in environments that don't yet have a subscription id.
    if realtime:
        limiter_key = f"realtime:{stage_id}"
        allowed, retry_after = _consume_token(limiter_key, _RATE_REALTIME, _BURST_REALTIME)
        if not allowed:
            _log.warning("rate limited realtime lookup for %s, retry after %s", stage_id, retry_after)
            return {
                'services': services,
                'schedules': schedules,
                'recentFailures': [],
                'rateLimited': True,
                'retryAfterSeconds': retry_after,
            }

        subscription_id = os.environ.get("AZURE_SUBSCRIPTION_ID")
        # Fall back: extract subscription ID embedded in catalog service ARM resource IDs
        # e.g. id = "/subscriptions/2cc2bc74-.../resourceGroups/ai-poc-rg"
        if not subscription_id:
            for _svc in services:
                _sid = (_svc.get("id") or "").split("/")
                if len(_sid) > 2 and _sid[1].lower() == "subscriptions" and _sid[2]:
                    subscription_id = _sid[2]
                    break
            if not subscription_id:
                for _svc in services:
                    subscription_id = _svc.get("subscriptionId") or None
                    if subscription_id:
                        break
        if subscription_id:
            try:
                from shared.azure_lookup import get_resource_statuses

                # Step 1: enrich already-cataloged services with live status via
                # type-specific SDK clients (App Service, VM, SQL MI, Synapse, etc.)
                known_rgs = {svc.get("resourceGroup") for svc in services if svc.get("resourceGroup")}
                for rg in known_rgs:
                    rg_services = [s for s in services if s.get("resourceGroup") == rg]
                    enriched = get_resource_statuses(subscription_id, rg, rg_services)
                    # write enriched values back into the original list by index
                    idx = 0
                    for i, svc in enumerate(services):
                        if svc.get("resourceGroup") == rg:
                            services[i] = enriched[idx]
                            idx += 1

                # Step 2: conventional rg-{stage_id} for undeclared resources.
                conventional_rg = f"rg-{stage_id}"
                if conventional_rg not in known_rgs:
                    try:
                        cred = DefaultAzureCredential()
                        rm_client = ResourceManagementClient(cred, subscription_id)
                        existing_ids = {s.get("id") for s in services if s.get("id")}
                        discovered: List[Dict[str, Any]] = []
                        for r in rm_client.resources.list_by_resource_group(conventional_rg):
                            if r.id not in existing_ids:
                                discovered.append({
                                    "type": r.type or "",
                                    "id": r.id,
                                    "name": r.name or "",
                                    "region": getattr(r, "location", None),
                                    "status": "Unknown",
                                    "resourceGroup": conventional_rg,
                                })
                        if discovered:
                            enriched = get_resource_statuses(subscription_id, conventional_rg, discovered)
                            services.extend(enriched)
                    except Exception as exc:
                        _log.debug("conventional rg scan failed for %s: %s", conventional_rg, exc)

                # Step 3: subscription scan as a last resort.
                if not services:
                    try:
                        cred = DefaultAzureCredential()
                        rm_client = ResourceManagementClient(cred, subscription_id)
                        discovered_sub: List[Dict[str, Any]] = []
                        for r in rm_client.resources.list():
                            tags = getattr(r, "tags", None) or {}
                            name_matches = stage_id.lower() in (r.name or "").lower()
                            tag_matches = any(stage_id.lower() == str(v).lower() for v in tags.values()) or (
                                tags.get("stage") == stage_id or tags.get("stageId") == stage_id
                            )
                            if name_matches or tag_matches:
                                rg_name = (r.id or "").split("/resourceGroups/")[-1].split("/")[0] if r.id else ""
                                discovered_sub.append({
                                    "type": r.type or "",
                                    "id": r.id,
                                    "name": r.name or "",
                                    "region": getattr(r, "location", None),
                                    "status": "Unknown",
                                    "resourceGroup": rg_name,
                                })
                        # Enrich per-RG
                        sub_by_rg: Dict[str, List[Dict[str, Any]]] = {}
                        for svc in discovered_sub:
                            sub_by_rg.setdefault(svc.get("resourceGroup", ""), []).append(svc)
                        for rg_name, rg_svcs in sub_by_rg.items():
                            if rg_name:
                                enriched = get_resource_statuses(subscription_id, rg_name, rg_svcs)
                                services.extend(enriched)
                            else:
                                services.extend(rg_svcs)
                    except Exception as exc:
                        _log.exception("subscription resource scan failed: %s", exc)
            except Exception as exc:
                _log.exception("azure lookup failed: %s", exc)

    # Fetch execution history (schedules + recent failures) via catalog provider.
    failures: List[Dict[str, Any]] = []
    try:
        if provider is not None:
            executions = provider.list_executions(stage_id, lookback_days)
            now = datetime.now(timezone.utc)
            lookback_cutoff = now - timedelta(days=lookback_days)
            sched_map: Dict[str, Dict[str, Any]] = {}
            for rec in executions:
                schedule_id = rec.get("scheduleId")
                status = rec.get("status")
                error = rec.get("error")
                environment = rec.get("environment")
                client = rec.get("client")
                ts_raw = rec.get("timestamp") or rec.get("Timestamp")
                try:
                    ts = datetime.fromisoformat(str(ts_raw).replace("Z", "+00:00")) if ts_raw else None
                except Exception:
                    ts = None
                if schedule_id:
                    entry = sched_map.setdefault(schedule_id, {
                        "scheduleId": schedule_id,
                        "lastAction": None,
                        "lastStatus": None,
                        "environment": environment,
                        "client": client,
                    })
                    if ts and (entry["lastAction"] is None or ts > entry["lastAction"]):
                        entry["lastAction"] = ts
                        entry["lastStatus"] = status
                if include_failures and (status and str(status).lower() == "error" or error):
                    if ts is None or ts >= lookback_cutoff:
                        failures.append({
                            "timestamp": ts_raw,
                            "scheduleId": schedule_id,
                            "environment": environment,
                            "client": client,
                            "stage": stage_id,
                            "status": status,
                            "error": error,
                        })
            for s in sched_map.values():
                last_action = s.get("lastAction")
                if isinstance(last_action, datetime):
                    s["lastAction"] = last_action.isoformat()
                if not any(x.get("scheduleId") == s["scheduleId"] for x in schedules):
                    schedules.append(s)
    except Exception as exc:
        _log.exception("failed to fetch execution history for %s: %s", stage_id, exc)


    # Merge results: return azure-discovered services and azurite-derived schedules/failures
    result = {
        'services': services,
        'schedules': schedules,
        'recentFailures': failures,
    }

    # Store in cache
    ttl = _DEFAULT_TTL_REALTIME if realtime else _DEFAULT_TTL
    expires_at = time.time() + ttl
    with _CACHE_LOCK:
        try:
            _CACHE[cache_key] = {'expires_at': expires_at, 'value': copy.deepcopy(result)}
        except Exception:
            # best-effort caching
            _log.debug('failed to cache get_stage_services result for %s', cache_key)

    return result
