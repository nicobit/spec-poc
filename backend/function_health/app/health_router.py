import asyncio
from fastapi import APIRouter, Depends
from .models import CheckResult, HealthResponse
from .settings import settings
from .utils import timed_call
from .checks.key_vault import check_key_vault
from .checks.ai_search import check_ai_search
from .checks.azure_openai import check_azure_openai
from .checks.sql_db import check_sql_db
from .checks.storage_blob import check_storage_blob
from .checks.storage_table import check_storage_table
from .checks.service_bus import check_service_bus
from .config_loader import load_services_config, resolve_field
from shared.auth.roles import admin_only, auth_only

router = APIRouter(tags=["health"])

@router.get("/api/health/healthz")
async def healthz():
    return {"status": "ok"}

async def _build_tasks_from_json():
    cfg = await load_services_config()
    services = cfg.get("services", [])
    timeout = cfg.get("default_timeout_seconds") or settings.DEFAULT_TIMEOUT_SECONDS

    tasks = []
    for s in services:
        if not s or not s.get("enabled", True):
            continue
        stype = (s.get("type") or "").lower()
        name = s.get("name") or stype
        conf = s.get("config") or {}

        if stype == "key_vault":
            async def fn(conf=conf):
                vault_uri = await resolve_field(conf.get("vault_uri"))
                test_secret = await resolve_field(conf.get("test_secret_name"))
                return await check_key_vault(vault_uri, test_secret)
            tasks.append((name, fn))

        elif stype == "ai_search":
            async def fn(conf=conf):
                endpoint = await resolve_field(conf.get("endpoint"))
                index_name = await resolve_field(conf.get("index_name"))
                return await check_ai_search(endpoint, index_name)
            tasks.append((name, fn))

        elif stype == "azure_openai":
            async def fn(conf=conf):
                endpoint = await resolve_field(conf.get("endpoint"))
                api_version = await resolve_field(conf.get("api_version")) or settings.AZURE_OPENAI_API_VERSION
                live_call = await resolve_field(conf.get("live_call"))
                if isinstance(live_call, str):
                    live_call = live_call.lower() in {"1","true","yes"}
                deployment = await resolve_field(conf.get("deployment"))
                return await check_azure_openai(endpoint, api_version, bool(live_call), deployment)
            tasks.append((name, fn))

        elif stype == "sql_db":
            async def fn(conf=conf):
                conn_str = await resolve_field(conf.get("conn_str"))
                return await check_sql_db(conn_str)
            tasks.append((name, fn))

        elif stype == "storage_blob":
            async def fn(conf=conf):
                conn_str = await resolve_field(conf.get("connection_string"))
                endpoint = await resolve_field(conf.get("endpoint"))
                container = await resolve_field(conf.get("container"))
                return await check_storage_blob(conn_str, endpoint, container)
            tasks.append((name, fn))

        elif stype == "storage_table":
            async def fn(conf=conf):
                conn_str = await resolve_field(conf.get("connection_string"))
                endpoint = await resolve_field(conf.get("endpoint"))
                table_name = await resolve_field(conf.get("table_name"))
                return await check_storage_table(conn_str, endpoint, table_name)
            tasks.append((name, fn))

        elif stype == "service_bus":
            async def fn(conf=conf):
                namespace = await resolve_field(conf.get("namespace"))
                entity_type = await resolve_field((conf.get("entity") or {}).get("type"))
                queue_name = await resolve_field((conf.get("entity") or {}).get("queue_name"))
                topic_name = await resolve_field((conf.get("entity") or {}).get("topic_name"))
                subscription_name = await resolve_field((conf.get("entity") or {}).get("subscription_name"))
                entity = {"type": (entity_type or ""), "queue_name": queue_name, "topic_name": topic_name, "subscription_name": subscription_name}
                return await check_service_bus(namespace, entity)
            tasks.append((name, fn))

        else:
            continue

    return tasks, timeout

@router.get("/api/health/readyz", response_model=HealthResponse, dependencies=[Depends(auth_only)])
async def readyz():
    tasks, timeout = await _build_tasks_from_json()
    if not tasks:
        # Legacy fallback removed for brevity; provide empty ok
        return HealthResponse(status="degraded", results=[])

    results = []
    overall = "pass"
    awaitables = [timed_call(fn, timeout) for _, fn in tasks]

    for (name, _), awaited in zip(tasks, await asyncio.gather(*awaitables, return_exceptions=False)):
        latency_ms, payload, err = awaited
        if isinstance(payload, dict) and payload.get("skipped"):
            status = "skip"
            details = payload
            error = payload.get("reason")
        elif err is None:
            status = "pass"
            details = payload if isinstance(payload, dict) else {"value": str(payload)}
            error = None
        else:
            status = "fail"
            details = {"error_type": err.__class__.__name__, "error": str(err)}
            error = str(err)
        results.append(CheckResult(name=name, status=status, latency_ms=round(latency_ms, 2), error=error, details=details))

    if any(r.status == "fail" for r in results):
        overall = "fail"
    elif any(r.status == "skip" for r in results):
        overall = "degraded"

    return HealthResponse(status=overall, results=results)

@router.get("/api/health/deps", response_model=HealthResponse)
async def deps(user=Depends(auth_only)):
    return await readyz()
