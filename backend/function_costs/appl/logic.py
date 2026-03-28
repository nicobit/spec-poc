import datetime as dt
from collections import defaultdict
from typing import Dict, List, Tuple

from .models import IncreaseItem


def _pct_change(current: float, previous: float) -> float | None:
    if previous == 0:
        return None
    return (current - previous) / previous * 100.0


def month_bounds(reference: dt.date) -> Tuple[dt.date, dt.date]:
    start = reference.replace(day=1)
    end = (start.replace(day=28) + dt.timedelta(days=4)).replace(day=1)  # next month 1st
    return start, end


def prev_month_bounds(reference: dt.date) -> Tuple[dt.date, dt.date]:
    cur_start, _ = month_bounds(reference)
    prev_end = cur_start
    prev_start = (cur_start - dt.timedelta(days=1)).replace(day=1)
    return prev_start, prev_end


def iso_week_start(d: dt.date) -> dt.date:
    return d - dt.timedelta(days=d.weekday())  # Monday


def _detect_keys(rows: List[Dict]) -> Tuple[str, str, str | None]:
    keys = set(rows[0].keys()) if rows else set()
    svc_key = "ServiceName" if "ServiceName" in keys else next((k for k in keys if k.lower() == "servicename"), "ServiceName")
    cost_key = "Cost" if "Cost" in keys else next((k for k in keys if k.lower() == "cost"), "Cost")
    date_key = next((k for k in ["UsageDate", "Date", "BillingMonth", "UsageStart"] if k in keys), None)
    return svc_key, cost_key, date_key


def sum_monthly_rows(rows: List[Dict]) -> Dict[str, Dict[str, float]]:
    svc_key, cost_key, date_key = _detect_keys(rows)
    out: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for r in rows:
        svc = r.get(svc_key, "Unknown")
        cost = float(r.get(cost_key, 0) or 0)
        period = str(r.get(date_key)) if date_key else "Period"
        out[period][svc] += cost
    return out


def sum_daily_to_weekly(rows: List[Dict]) -> Dict[str, Dict[str, float]]:
    svc_key, cost_key, date_key = _detect_keys(rows)
    weekly: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for r in rows:
        svc = r.get(svc_key, "Unknown")
        cost = float(r.get(cost_key, 0) or 0)
        if not date_key or not r.get(date_key):
            bucket = "UnknownWeek"
        else:
            ds = str(r[date_key])[:10]
            # Handle date strings like 'YYYYMMDD' by converting to 'YYYY-MM-DD'
            if len(ds) == 8 and ds.isdigit():
                ds = f"{ds[:4]}-{ds[4:6]}-{ds[6:]}"
            d = dt.date.fromisoformat(ds)
            monday = iso_week_start(d)
            y, w, _ = monday.isocalendar()
            bucket = f"{y}-W{w:02d}"
        weekly[bucket][svc] += cost
    return weekly


def compare_two_periods_map(cur: Dict[str, float], prev: Dict[str, float]) -> List[IncreaseItem]:
    services = set(cur) | set(prev)
    items: List[IncreaseItem] = []
    for s in services:
        c = round(float(cur.get(s, 0.0)), 2)
        p = round(float(prev.get(s, 0.0)), 2)
        pct = None if p == 0 else round((_pct_change(c, p) or 0.0), 2)
        abs_change = round(c - p, 2)
        items.append(IncreaseItem(service_name=s, current_cost=c, previous_cost=p, pct_change=pct, abs_change=abs_change))
    # sort by largest positive abs increase; tie-break on current cost
    items.sort(key=lambda x: (-x.abs_change, -x.current_cost))
    return items


def add_share_of_increase(items: List[IncreaseItem]) -> float:
    total_inc = sum(max(i.abs_change or 0.0, 0.0) for i in items)
    if total_inc > 0:
        for it in items:
            inc = max(it.abs_change or 0.0, 0.0)
            it.share_of_increase_pct = round(100.0 * inc / total_inc, 2) if inc > 0 else 0.0
    else:
        for it in items:
            it.share_of_increase_pct = 0.0
    return round(total_inc, 2)
