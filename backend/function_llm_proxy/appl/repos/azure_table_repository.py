# app/repos/azure_table_repository.py
from datetime import date, timedelta
from typing import Optional, List, Dict, Any
from azure.data.tables import TableServiceClient, UpdateMode
from azure.core.exceptions import ResourceNotFoundError
from function_llm_proxy.appl.repos.usage_repository import IUsageRepository
from function_llm_proxy.appl.config import get_settings
import os
from shared.config.settings import BLOB_STORAGE_CONNECTION_STRING_SECRET_NAME, KEY_VAULT_CORE_URI
from shared.services.secret_service import SecretService

def _partition(user_id: str) -> str:
    return user_id

def _rowkey(d: date) -> str:
    return d.strftime("%Y%m%d")

class AzureTableUsageRepository(IUsageRepository):
    def __init__(self):
        s = get_settings()
        acct = s.STORAGE_ACCOUNT_NAME
        conn = SecretService.get_secret_value(KEY_VAULT_CORE_URI, BLOB_STORAGE_CONNECTION_STRING_SECRET_NAME)
        if not conn:
            # Allow connection via AccountName/Key envs too
            account_key = os.getenv("AZURE_STORAGE_KEY")
            if acct and account_key:
                conn = f"DefaultEndpointsProtocol=https;AccountName={acct};AccountKey={account_key};EndpointSuffix=core.windows.net"
        if not conn:
            raise RuntimeError("No Storage connection string available.")
        self.client = TableServiceClient.from_connection_string(conn)
        self.table = self.client.get_table_client(get_settings().USAGE_TABLE_NAME)
        self._ensured = False

    def ensure(self) -> None:
        if self._ensured:
            return
        try:
            self.table.create_table()
        except Exception:
            pass
        self._ensured = True

    def get_day(self, user_id: str, yyyymmdd: str) -> Optional[Dict[str, Any]]:
        try:
            ent = self.table.get_entity(partition_key=_partition(user_id), row_key=yyyymmdd)
            return dict(ent)
        except ResourceNotFoundError:
            return None

    def upsert_day(self, user_id: str, yyyymmdd: str, delta_prompt: int, delta_completion: int,
                   model: Optional[str], default_quota: int) -> Dict[str, Any]:
        pk = _partition(user_id)
        rk = yyyymmdd
        try:
            ent = self.table.get_entity(pk, rk)
            ent["prompt_tokens"] = int(ent.get("prompt_tokens", 0)) + int(delta_prompt)
            ent["completion_tokens"] = int(ent.get("completion_tokens", 0)) + int(delta_completion)
            ent["total_tokens"] = int(ent["prompt_tokens"]) + int(ent["completion_tokens"])
            ent["model"] = model or ent.get("model")
            self.table.update_entity(mode=UpdateMode.REPLACE, entity=ent)
            return dict(ent)
        except ResourceNotFoundError:
            ent = {
                "PartitionKey": pk,
                "RowKey": rk,
                "prompt_tokens": int(delta_prompt),
                "completion_tokens": int(delta_completion),
                "total_tokens": int(delta_prompt) + int(delta_completion),
                "quota": int(default_quota),
                "model": model or "",
            }
            self.table.create_entity(ent)
            return ent

    def set_quota(self, user_id: str, quota: int) -> None:
        # Store quota for "today" row (or next write will carry default). We can also keep a dedicated RowKey "quota".
        pk = _partition(user_id)
        rk = "quota"
        try:
            ent = self.table.get_entity(pk, rk)
            ent["quota"] = int(quota)
            self.table.update_entity(mode=UpdateMode.REPLACE, entity=ent)
        except ResourceNotFoundError:
            ent = {"PartitionKey": pk, "RowKey": rk, "quota": int(quota)}
            self.table.create_entity(ent)

    def get_range(self, user_id: str, start: date, end: date) -> List[Dict[str, Any]]:
        # Inclusive range
        results: List[Dict[str, Any]] = []
        d = start
        while d <= end:
            rk = _rowkey(d)
            try:
                ent = self.table.get_entity(_partition(user_id), rk)
                results.append(dict(ent))
            except ResourceNotFoundError:
                pass
            d += timedelta(days=1)
        return results
