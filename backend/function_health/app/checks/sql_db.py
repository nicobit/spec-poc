from typing import Optional, Dict, Any
import anyio

async def _sync_sql_ping(conn_str: str) -> Dict[str, Any]:
    import pyodbc
    with pyodbc.connect(conn_str, timeout=3) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        row = cursor.fetchone()
        return {"result": int(row[0]) if row else None}

async def check_sql_db(conn_str: Optional[str]) -> Dict[str, Any]:
    if not conn_str:
        return {"skipped": True, "reason": "SQL_ODBC_CONNECTION_STRING not set"}
    return await anyio.to_thread.run_sync(_sync_sql_ping, conn_str)
