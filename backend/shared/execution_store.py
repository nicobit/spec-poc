from __future__ import annotations

import os
from copy import deepcopy
from typing import Any, Dict, List, Optional

from azure.cosmos import CosmosClient, PartitionKey, exceptions

from .execution_model import StageExecution


COSMOS_CONN = os.environ.get("COSMOS_CONNECTION_STRING")
COSMOS_DB = os.environ.get("COSMOS_DB_NAME", "adminportal")
COSMOS_STAGE_EXECUTION_CONTAINER = os.environ.get("COSMOS_STAGE_EXECUTION_CONTAINER_NAME", "stageexecutions")


STAGE_EXECUTIONS: List[Dict[str, Any]] = []


def _ensure_model(data: Dict[str, Any]) -> Dict[str, Any]:
    model = StageExecution.model_validate(data)
    return model.model_dump()


def list_stage_executions() -> List[Dict[str, Any]]:
    return deepcopy(STAGE_EXECUTIONS)


def get_stage_execution(execution_id: str) -> Optional[Dict[str, Any]]:
    for item in STAGE_EXECUTIONS:
        if item.get("executionId") == execution_id or item.get("id") == execution_id:
            return deepcopy(item)
    return None


def upsert_stage_execution(data: Dict[str, Any]) -> Dict[str, Any]:
    payload = _ensure_model(data)
    for idx, item in enumerate(STAGE_EXECUTIONS):
        if item.get("executionId") == payload.get("executionId") or item.get("id") == payload.get("id"):
            STAGE_EXECUTIONS[idx] = payload
            return deepcopy(payload)
    STAGE_EXECUTIONS.append(payload)
    return deepcopy(payload)


def get_latest_stage_execution(stage_id: str) -> Optional[Dict[str, Any]]:
    items = [item for item in STAGE_EXECUTIONS if item.get("stageId") == stage_id]
    if not items:
        return None
    items.sort(key=lambda item: item.get("requestedAt") or "", reverse=True)
    return deepcopy(items[0])


def list_stage_executions_for_stage(stage_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    items = [item for item in STAGE_EXECUTIONS if item.get("stageId") == stage_id]
    items.sort(key=lambda item: item.get("requestedAt") or "", reverse=True)
    return deepcopy(items[:limit])


def list_stage_executions_for_schedule(schedule_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    items = [item for item in STAGE_EXECUTIONS if item.get("scheduleId") == schedule_id]
    items.sort(key=lambda item: item.get("requestedAt") or "", reverse=True)
    return deepcopy(items[:limit])


class CosmosStageExecutionStore:
    def __init__(self):
        if not COSMOS_CONN:
            raise RuntimeError("COSMOS_CONNECTION_STRING not set")
        self.client = CosmosClient.from_connection_string(COSMOS_CONN)
        self._db = self._get_or_create_db(COSMOS_DB)
        self._container = self._get_or_create_container(COSMOS_STAGE_EXECUTION_CONTAINER)

    def _get_or_create_db(self, name: str):
        try:
            return self.client.create_database_if_not_exists(id=name)
        except exceptions.CosmosHttpResponseError:
            return self.client.get_database_client(name)

    def _get_or_create_container(self, name: str):
        try:
            return self._db.create_container_if_not_exists(id=name, partition_key=PartitionKey(path="/clientId"))
        except exceptions.CosmosHttpResponseError:
            return self._db.get_container_client(name)

    def upsert_stage_execution(self, data: Dict[str, Any]) -> Dict[str, Any]:
        payload = _ensure_model(data)
        return self._container.upsert_item(payload)

    def get_stage_execution(self, execution_id: str) -> Optional[Dict[str, Any]]:
        query = "SELECT * FROM c WHERE c.executionId = @id OR c.id = @id"
        params = [{"name": "@id", "value": execution_id}]
        items = list(self._container.query_items(query=query, parameters=params, enable_cross_partition_query=True))
        return items[0] if items else None

    def get_latest_stage_execution(self, stage_id: str) -> Optional[Dict[str, Any]]:
        query = "SELECT TOP 1 * FROM c WHERE c.stageId = @stageId ORDER BY c.requestedAt DESC"
        params = [{"name": "@stageId", "value": stage_id}]
        items = list(self._container.query_items(query=query, parameters=params, enable_cross_partition_query=True))
        return items[0] if items else None

    def list_stage_executions_for_stage(self, stage_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        query = "SELECT * FROM c WHERE c.stageId = @stageId ORDER BY c.requestedAt DESC"
        params = [{"name": "@stageId", "value": stage_id}]
        items = list(self._container.query_items(query=query, parameters=params, enable_cross_partition_query=True))
        return items[:limit]

    def list_stage_executions_for_schedule(self, schedule_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        query = "SELECT * FROM c WHERE c.scheduleId = @scheduleId ORDER BY c.requestedAt DESC"
        params = [{"name": "@scheduleId", "value": schedule_id}]
        items = list(self._container.query_items(query=query, parameters=params, enable_cross_partition_query=True))
        return items[:limit]


class _LazyExecutionStoreProxy:
    def __init__(self):
        self._store = None

    def _ensure(self):
        if self._store is None:
            self._store = CosmosStageExecutionStore()

    def __getattr__(self, item):
        self._ensure()
        return getattr(self._store, item)


def get_stage_execution_store():
    if not COSMOS_CONN:
        return None
    return _LazyExecutionStoreProxy()

