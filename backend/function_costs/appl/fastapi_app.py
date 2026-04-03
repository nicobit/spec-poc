import datetime as dt
from fastapi import Depends, FastAPI, Query, HTTPException, Response
from typing import Optional, Any, Callable, Awaitable

from shared.auth.roles import admin_only, auth_only
from .settings import settings
from .models import IncreaseResponse, TopDriversResponse
from .cost_client import CostClient
from .logic import (
    month_bounds, prev_month_bounds, sum_monthly_rows, sum_daily_to_weekly,
    compare_two_periods_map, add_share_of_increase
)
from .cache import InMemoryTTLCache, RedisTTLCache, canonical_key
from .utils.dateparse import parse_date

app = FastAPI(title="Azure Cost Increase API (Functions) + Cache", version="1.3.0")
client = CostClient()

# Cache instance
if settings.redis_url:
    cache = RedisTTLCache(settings.redis_url, ttl=settings.cache_ttl_seconds, prefix=settings.cache_prefix)
else:
    cache = InMemoryTTLCache(ttl=settings.cache_ttl_seconds)

def _resolve_scope(scope: Optional[str]) -> str:
    resolved = scope or settings.default_scope
    if not resolved:
        raise HTTPException(
            status_code=400,
            detail="Missing 'scope'. Provide ?scope=/subscriptions/<subId> or set DEFAULT_SCOPE."
        )
    return resolved

async def _fetch_cached(
    endpoint: str,
    params: dict[str, Any],
    build: Callable[[], Awaitable[dict]],
    no_cache: bool
) -> dict:
    key = canonical_key(endpoint, params)
    if not no_cache:
        cached = await cache.get(key)
        if cached is not None:
            return cached
    data = await build()
    await cache.set(key, data)
    return data

@app.get("/api/costs/health")
async def health(user=Depends(auth_only)):
    return {
        "ok": True,
        "cache": "redis" if settings.redis_url else "memory",
        "ttl": settings.cache_ttl_seconds
    }

@app.get("/api/costs/admin/cache/clear")
async def cache_clear(user=Depends(admin_only)):
    # ⚠️ Protect with app roles in production
    await cache.clear()
    return {"cleared": True}

@app.get("/api/costs/increase/month", response_model=IncreaseResponse)
async def increase_by_month(
    response: Response,
    scope: Optional[str] = Query(default=None),
    reference_date: Optional[str] = Query(default=None, description="YYYY-MM-DD (any day in current month)"),
    no_cache: int = Query(default=0, ge=0, le=1),
    user=Depends(auth_only),
):
    scope = _resolve_scope(scope)
    try:
        today = parse_date(reference_date) if reference_date else dt.date.today()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    prev_start, _prev_end = prev_month_bounds(today)
    _cur_start, cur_end = month_bounds(today)

    async def build():
        currency, rows = await client.query_monthly_by_service(scope, prev_start, cur_end)
        by_period = sum_monthly_rows(rows)
        periods = sorted(by_period.keys())
        if len(periods) < 2:
            raise HTTPException(404, "Not enough monthly data to compare two periods.")
        prev_key, cur_key = periods[-2], periods[-1]
        prev_map, cur_map = by_period[prev_key], by_period[cur_key]
        items = compare_two_periods_map(cur_map, prev_map)
        _ = add_share_of_increase(items)
        return {
            "scope": scope,
            "currency": currency,
            "granularity": "Monthly",
            "period_current": str(cur_key),
            "period_previous": str(prev_key),
            "items": [i.model_dump() for i in items],
        }

    payload = await _fetch_cached(
        "increase_month",
        {"scope": scope, "reference_date": reference_date},
        build,
        no_cache=bool(no_cache),
    )
    response.headers["Cache-Control"] = f"public, max-age={settings.cache_ttl_seconds}"
    return payload

@app.get("/api/costs/increase/week", response_model=IncreaseResponse)
async def increase_by_week(
    response: Response,
    scope: Optional[str] = Query(default=None),
    weeks_window: int = Query(default=1, ge=1, le=8),
    reference_end: Optional[str] = Query(default=None, description="YYYY-MM-DD (exclusive)"),
    no_cache: int = Query(default=0, ge=0, le=1),
    user=Depends(auth_only),
):
    scope = _resolve_scope(scope)
    try:
        end = parse_date(reference_end) if reference_end else dt.date.today()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    current_start = end - dt.timedelta(days=7 * weeks_window)
    previous_start = current_start - dt.timedelta(days=7 * weeks_window)

    async def build():
        currency, rows = await client.query_daily_by_service(scope, previous_start, end)
        weekly = sum_daily_to_weekly(rows)

        def iso_label(d: dt.date) -> str:
            monday = d - dt.timedelta(days=d.weekday())
            y, w, _ = monday.isocalendar()
            return f"{y}-W{w:02d}"

        prev_weeks = [iso_label(previous_start + dt.timedelta(days=i * 7)) for i in range(weeks_window)]
        cur_weeks = [iso_label(current_start + dt.timedelta(days=i * 7)) for i in range(weeks_window)]

        from collections import defaultdict
        acc_prev, acc_cur = defaultdict(float), defaultdict(float)
        for wk in prev_weeks:
            for svc, c in weekly.get(wk, {}).items():
                acc_prev[svc] += float(c or 0)
        for wk in cur_weeks:
            for svc, c in weekly.get(wk, {}).items():
                acc_cur[svc] += float(c or 0)

        items = compare_two_periods_map(dict(acc_cur), dict(acc_prev))
        _ = add_share_of_increase(items)
        return {
            "scope": scope,
            "currency": currency,
            "granularity": "Weekly (ISO)",
            "period_current": f"{cur_weeks[0]}..{cur_weeks[-1]}",
            "period_previous": f"{prev_weeks[0]}..{prev_weeks[-1]}",
            "items": [i.model_dump() for i in items],
        }

    payload = await _fetch_cached(
        "increase_week",
        {"scope": scope, "weeks_window": weeks_window, "reference_end": reference_end},
        build,
        no_cache=bool(no_cache),
    )
    response.headers["Cache-Control"] = f"public, max-age={settings.cache_ttl_seconds}"
    return payload

@app.get("/api/costs/top-drivers", response_model=TopDriversResponse)
async def top_drivers(
    response: Response,
    scope: Optional[str] = Query(default=None),
    mode: str = Query(default="month", pattern="^(month|week)$"),
    weeks_window: int = Query(default=1, ge=1, le=8),
    reference_date: Optional[str] = Query(default=None),
    reference_end: Optional[str] = Query(default=None),
    top_n: int = Query(default=5, ge=1, le=50),
    no_cache: int = Query(default=0, ge=0, le=1),
    user=Depends(auth_only),
):
    scope = _resolve_scope(scope)

    async def build():
        if mode == "month":
            today = dt.date.fromisoformat(reference_date) if reference_date else dt.date.today()
            prev_start, _prev_end = prev_month_bounds(today)
            _cur_start, cur_end = month_bounds(today)
            currency, rows = await client.query_monthly_by_service(scope, prev_start, cur_end)
            by_period = sum_monthly_rows(rows)
            periods = sorted(by_period.keys())
            if len(periods) < 2:
                raise HTTPException(404, "Not enough monthly data to compare two periods.")
            prev_key, cur_key = periods[-2], periods[-1]
            prev_map, cur_map = by_period[prev_key], by_period[cur_key]
            gran = "Monthly"
            p_prev, p_cur = str(prev_key), str(cur_key)
        else:
            end = dt.date.fromisoformat(reference_end) if reference_end else dt.date.today()
            current_start = end - dt.timedelta(days=7 * weeks_window)
            previous_start = current_start - dt.timedelta(days=7 * weeks_window)
            currency, rows = await client.query_daily_by_service(scope, previous_start, end)
            weekly = sum_daily_to_weekly(rows)

            def iso_label(d: dt.date) -> str:
                monday = d - dt.timedelta(days=d.weekday())
                y, w, _ = monday.isocalendar()
                return f"{y}-W{w:02d}"

            prev_weeks = [iso_label(previous_start + dt.timedelta(days=i * 7)) for i in range(weeks_window)]
            cur_weeks = [iso_label(current_start + dt.timedelta(days=i * 7)) for i in range(weeks_window)]

            from collections import defaultdict
            acc_prev, acc_cur = defaultdict(float), defaultdict(float)
            for wk in prev_weeks:
                for svc, c in weekly.get(wk, {}).items():
                    acc_prev[svc] += float(c or 0)
            for wk in cur_weeks:
                for svc, c in weekly.get(wk, {}).items():
                    acc_cur[svc] += float(c or 0)

            prev_map, cur_map = dict(acc_prev), dict(acc_cur)
            gran = "Weekly (ISO)"
            p_prev, p_cur = f"{prev_weeks[0]}..{prev_weeks[-1]}", f"{cur_weeks[0]}..{cur_weeks[-1]}"

        items = compare_two_periods_map(cur_map, prev_map)
        total_increase = add_share_of_increase(items)
        drivers = [i for i in items if (i.abs_change or 0) > 0][:top_n]
        return {
            "scope": scope,
            "currency": currency,
            "granularity": gran,
            "period_current": p_cur,
            "period_previous": p_prev,
            "total_increase": total_increase,
            "drivers": [i.model_dump() for i in drivers],
        }

    payload = await _fetch_cached(
        "top_drivers",
        {
            "scope": scope, "mode": mode, "weeks_window": weeks_window,
            "reference_date": reference_date, "reference_end": reference_end, "top_n": top_n
        },
        build,
        no_cache=bool(no_cache),
    )
    response.headers["Cache-Control"] = f"public, max-age={settings.cache_ttl_seconds}"
    return payload
