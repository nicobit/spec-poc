from typing import Optional, Dict, Any
import anyio
from app.services.secret_service import SecretService

async def _sync_table_ping(connection_string: Optional[str], endpoint: Optional[str], table_name: Optional[str]) -> Dict[str, Any]:
    from azure.identity import DefaultAzureCredential
    from azure.data.tables import TableServiceClient

    if not connection_string and not endpoint:
        return {"skipped": True, "reason": "Provide 'connection_string' or 'endpoint'"}

    if connection_string:
        tsc = TableServiceClient.from_connection_string(conn_str=connection_string)
    else:
        cred = SecretService.credential()
        tsc = TableServiceClient(endpoint=endpoint, credential=cred)

    if table_name:
        tc = tsc.get_table_client(table_name)
        entities = tc.list_entities(results_per_page=1)
        first = next(iter(entities), None)
        return {"skipped": False, "method": "list_entities", "peeked": 1 if first is not None else 0}
    else:
        tables = tsc.list_tables(results_per_page=1)
        first = next(iter(tables), None)
        name = getattr(first, "name", None) if first is not None else None
        if name is None and isinstance(first, dict):
            name = first.get("name")
        return {"skipped": False, "method": "list_tables", "first_table": name}

async def check_storage_table(connection_string: Optional[str], endpoint: Optional[str], table_name: Optional[str]) -> Dict[str, Any]:
    return await anyio.to_thread.run_sync(_sync_table_ping, connection_string, endpoint, table_name)
