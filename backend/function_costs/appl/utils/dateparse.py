# utils/dateparse.py
import datetime as dt

def parse_date(s: str) -> dt.date:
    if not s:
        raise ValueError("Empty date")
    # Preferred ISO format
    try:
        return dt.date.fromisoformat(s)  # YYYY-MM-DD
    except Exception:
        pass
    # Accept compact form YYYYMMDD
    if len(s) == 8 and s.isdigit():
        return dt.datetime.strptime(s, "%Y%m%d").date()
    # (Optional) add other formats you want to accept:
    # try: return dt.datetime.strptime(s, "%d/%m/%Y").date()
    raise ValueError(f"Unsupported date format: {s}. Use YYYY-MM-DD (e.g., 2025-08-30).")
