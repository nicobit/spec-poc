import os
import json
from typing import List, Dict, Any, Optional

COSMOS_CONN = os.environ.get("COSMOS_CONNECTION_STRING")
TABLES_CONN = os.environ.get("AZURE_TABLES_CONNECTION_STRING") or os.environ.get("AZURE_STORAGE_CONNECTION_STRING") or os.environ.get("AzureWebJobsStorage")
ENV_TABLE_NAME = os.environ.get("AZURE_TABLES_ENV_TABLE", "Environments")
COSMOS_DB = os.environ.get("COSMOS_DB_NAME", "adminportal")
COSMOS_CONTAINER = os.environ.get("COSMOS_ENV_CONTAINER", "environments")


class _BaseStore:
    def list_environments(self) -> List[Dict[str, Any]]:
        raise NotImplementedError()

    def get_environment(self, env_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError()

    def create_environment(self, data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError()
    
    def delete_environment(self, env_id: str) -> bool:
        raise NotImplementedError()


class TableEnvironmentStore(_BaseStore):
    def __init__(self):
        if not TABLES_CONN:
            raise RuntimeError("Table storage connection not configured")
        from azure.data.tables import TableServiceClient

        svc = TableServiceClient.from_connection_string(TABLES_CONN)
        self._table = svc.get_table_client(ENV_TABLE_NAME)
        try:
            self._table.create_table()
        except Exception:
            pass

    def list_environments(self) -> List[Dict[str, Any]]:
        results = []
        try:
            for ent in self._table.list_entities():
                # environment stored in 'data' JSON field
                data = ent.get("data")
                if isinstance(data, str):
                    try:
                        obj = json.loads(data)
                    except Exception:
                        obj = {"id": ent.get("RowKey"), "name": ent.get("RowKey")}
                else:
                    obj = data or {"id": ent.get("RowKey")}
                results.append(obj)
        except Exception:
            return []
        return results

    def get_environment(self, env_id: str) -> Optional[Dict[str, Any]]:
        try:
            ent = self._table.get_entity(partition_key="environments", row_key=env_id)
            data = ent.get("data")
            if isinstance(data, str):
                return json.loads(data)
            return data
        except Exception:
            return None

    def create_environment(self, data: Dict[str, Any]) -> Dict[str, Any]:
        # validate payload against EnvironmentModel before persisting
        from .environment_model import EnvironmentModel

        env = dict(data)
        try:
            EnvironmentModel.parse_obj(env)
        except Exception:
            raise
        env_id = env.get("id") or f"env-{os.urandom(4).hex()}"
        env["id"] = env_id
        # enforce uniqueness of (client, name)
        name = str(env.get("name") or "").lower()
        client = str(env.get("client") or "")
        try:
            for ent in self._table.list_entities():
                d = ent.get("data")
                if isinstance(d, str):
                    try:
                        obj = json.loads(d)
                    except Exception:
                        obj = {}
                else:
                    obj = d or {}
                if str(obj.get("client") or "") == client and str(obj.get("name") or "").lower() == name:
                    raise ValueError("Conflict: environment with same client and name exists")
        except ValueError:
            raise
        except Exception:
            # ignore listing errors
            pass
        entity = {"PartitionKey": "environments", "RowKey": env_id, "data": json.dumps(env, ensure_ascii=False)}
        # use upsert to allow both create and update semantics
        try:
            self._table.upsert_entity(entity=entity)
        except Exception:
            # older SDKs may not have upsert_entity; fall back to create/replace
            try:
                self._table.create_entity(entity=entity)
            except Exception:
                self._table.update_entity(mode="REPLACE", entity=entity)
        return env

    def delete_environment(self, env_id: str) -> bool:
        try:
            self._table.delete_entity(partition_key="environments", row_key=env_id)
            return True
        except Exception:
            return False

    def update_environment(self, env: Dict[str, Any]) -> Dict[str, Any]:
        env_id = env.get("id")
        if not env_id:
            raise ValueError("environment must include id")
        # validate payload
        from .environment_model import EnvironmentModel
        try:
            EnvironmentModel.parse_obj(env)
        except Exception:
            raise

        entity = {"PartitionKey": "environments", "RowKey": env_id, "data": json.dumps(env, ensure_ascii=False)}
        try:
            self._table.upsert_entity(entity=entity)
        except Exception:
            try:
                self._table.update_entity(mode="REPLACE", entity=entity)
            except Exception:
                self._table.create_entity(entity=entity)
        return env


class CosmosEnvironmentStore(_BaseStore):
    def __init__(self):
        if not COSMOS_CONN:
            raise RuntimeError("Cosmos connection not configured")
        from azure.cosmos import CosmosClient, PartitionKey

        self.client = CosmosClient.from_connection_string(COSMOS_CONN)
        self._db = self.client.create_database_if_not_exists(id=COSMOS_DB)
        self._container = self._db.create_container_if_not_exists(id=COSMOS_CONTAINER, partition_key=PartitionKey(path="/client"))

    def list_environments(self) -> List[Dict[str, Any]]:
        query = "SELECT * FROM c"
        items = list(self._container.query_items(query=query, enable_cross_partition_query=True))
        return items

    def get_environment(self, env_id: str) -> Optional[Dict[str, Any]]:
        query = "SELECT * FROM c WHERE c.id = @id"
        params = [{"name": "@id", "value": env_id}]
        items = list(self._container.query_items(query=query, parameters=params, enable_cross_partition_query=True))
        return items[0] if items else None

    def create_environment(self, data: Dict[str, Any]) -> Dict[str, Any]:
        env = dict(data)
        if "id" not in env:
            import uuid

            env["id"] = f"env-{uuid.uuid4().hex[:8]}"
        if "client" not in env:
            env["client"] = env.get("client", "default")
        # enforce uniqueness of (client, name)
        name = str(env.get("name") or "").lower()
        client = str(env.get("client") or "")
        query = "SELECT * FROM c WHERE LOWER(c.name) = @name AND c.client = @client"
        params = [
            {"name": "@name", "value": name},
            {"name": "@client", "value": client},
        ]
        try:
            items = list(self._container.query_items(query=query, parameters=params, enable_cross_partition_query=True))
            if items:
                raise ValueError("Conflict: environment with same client and name exists")
        except ValueError:
            raise
        except Exception:
            # ignore query errors
            pass
        created = self._container.upsert_item(env)
        return created

    def delete_environment(self, env_id: str) -> bool:
        # Attempt to read the item to obtain partition key (client), then delete
        env = self.get_environment(env_id)
        if not env:
            return False
        try:
            partition_key = env.get("client") or None
            # delete by id using partition key when available
            if partition_key:
                self._container.delete_item(item=env_id, partition_key=partition_key)
            else:
                # best-effort: delete by id without partition key may fail
                self._container.delete_item(item=env_id, partition_key=env.get("client"))
            return True
        except Exception:
            return False

    def update_environment(self, env: Dict[str, Any]) -> Dict[str, Any]:
        # upsert_item provides update semantics
        return self._container.upsert_item(env)


class _LazyEnvRepo:
    def __init__(self):
        self._store: Optional[_BaseStore] = None

    def _ensure(self):
        if self._store is not None:
            return
        # prefer Cosmos if connection present and env requests it
        if COSMOS_CONN and os.environ.get("ENV_STORE_TYPE", "table").lower() == "cosmos":
            try:
                self._store = CosmosEnvironmentStore()
                return
            except Exception:
                self._store = None
        # fallback to table storage
        if TABLES_CONN:
            try:
                self._store = TableEnvironmentStore()
                return
            except Exception:
                self._store = None

    def __getattr__(self, item):
        self._ensure()
        if self._store is None:
            raise RuntimeError("No environment store configured")
        return getattr(self._store, item)


def get_environment_store() -> Optional[_LazyEnvRepo]:
    # Return a lazy proxy if a backing store is configured; otherwise return None
    # to allow in-memory-only test and dev scenarios.
    if not (TABLES_CONN or COSMOS_CONN):
        return None
    return _LazyEnvRepo()
