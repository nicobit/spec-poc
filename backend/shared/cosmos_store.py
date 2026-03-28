import os
from typing import List, Dict, Any
from datetime import datetime

from azure.cosmos import CosmosClient, PartitionKey, exceptions

COSMOS_CONN = os.environ.get("COSMOS_CONNECTION_STRING")
COSMOS_DB = os.environ.get("COSMOS_DB_NAME", "adminportal")
COSMOS_CONTAINER = os.environ.get("COSMOS_CONTAINER_NAME", "schedules")


class CosmosScheduleStore:
    def __init__(self):
        if not COSMOS_CONN:
            raise RuntimeError("COSMOS_CONNECTION_STRING not set")
        self.client = CosmosClient.from_connection_string(COSMOS_CONN)
        self._db = self._get_or_create_db(COSMOS_DB)
        self._container = self._get_or_create_container(COSMOS_CONTAINER)

    def _get_or_create_db(self, name: str):
        try:
            return self.client.create_database_if_not_exists(id=name)
        except exceptions.CosmosHttpResponseError:
            return self.client.get_database_client(name)

    def _get_or_create_container(self, name: str):
        try:
            # partition by client to support per-client scale and queries
            return self._db.create_container_if_not_exists(id=name, partition_key=PartitionKey(path="/client"))
        except exceptions.CosmosHttpResponseError:
            return self._db.get_container_client(name)

    def upsert_schedule(self, schedule: Dict[str, Any]):
        # ensure id and client present
        if "id" not in schedule:
            raise ValueError("schedule must include 'id'")
        if "client" not in schedule:
            schedule["client"] = schedule.get("client", "default")
        return self._container.upsert_item(schedule)

    def get_schedule(self, schedule_id: str) -> Dict[str, Any]:
        query = "SELECT * FROM c WHERE c.id = @id"
        params = [{"name": "@id", "value": schedule_id}]
        items = list(self._container.query_items(query=query, parameters=params, enable_cross_partition_query=True))
        return items[0] if items else None

    def list_schedules(self, limit: int = 100) -> List[Dict[str, Any]]:
        query = "SELECT * FROM c"
        items = list(self._container.query_items(query=query, enable_cross_partition_query=True))
        return items[:limit]

    def get_due_schedules(self, now_iso: str) -> List[Dict[str, Any]]:
        # Query schedules with enabled true and next_run <= now
        query = "SELECT * FROM c WHERE c.enabled = true AND c.next_run <= @now"
        params = [{"name": "@now", "value": now_iso}]
        items = list(self._container.query_items(query=query, parameters=params, enable_cross_partition_query=True))
        return items

    def mark_next_run(self, schedule_id: str, next_run_iso: str):
        # find by id and replace
        item = self.get_schedule(schedule_id)
        if not item:
            return None
        item["next_run"] = next_run_iso
        return self._container.replace_item(item=item["id"], body=item)

    def delete_schedule(self, schedule_id: str):
        item = self.get_schedule(schedule_id)
        if not item:
            return False
        try:
            self._container.delete_item(item=item["id"], partition_key=item.get("client"))
            return True
        except exceptions.CosmosResourceNotFoundError:
            return False


class _LazyCosmosProxy:
    def __init__(self):
        self._store = None

    def _ensure(self):
        if self._store is None:
            self._store = CosmosScheduleStore()

    def __getattr__(self, item):
        self._ensure()
        return getattr(self._store, item)


def get_cosmos_store():
    if not COSMOS_CONN:
        return None
    return _LazyCosmosProxy()
