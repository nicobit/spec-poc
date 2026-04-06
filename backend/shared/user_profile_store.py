import os
import json
from typing import List, Optional, Dict, Any

TABLES_CONN = os.environ.get("AZURE_TABLES_CONNECTION_STRING") or os.environ.get("AZURE_STORAGE_CONNECTION_STRING") or os.environ.get("AzureWebJobsStorage")
COSMOS_CONN = os.environ.get("COSMOS_CONNECTION_STRING")
USER_TABLE_NAME = os.environ.get("AZURE_TABLES_USER_PROFILE_TABLE", "UserProfiles")
COSMOS_DB = os.environ.get("COSMOS_DB_NAME", "adminportal")
COSMOS_CONTAINER = os.environ.get("COSMOS_USER_CONTAINER", "user_profiles")


class _BaseStore:
    def get_favorites(self, user_id: str) -> List[str]:
        raise NotImplementedError()

    def set_favorites(self, user_id: str, favorites: List[str]) -> List[str]:
        raise NotImplementedError()

    def add_favorite(self, user_id: str, env_id: str) -> List[str]:
        raise NotImplementedError()

    def remove_favorite(self, user_id: str, env_id: str) -> None:
        raise NotImplementedError()


class InMemoryUserProfileStore(_BaseStore):
    def __init__(self):
        self._data: Dict[str, List[str]] = {}

    def get_favorites(self, user_id: str) -> List[str]:
        return list(self._data.get(user_id, []))

    def set_favorites(self, user_id: str, favorites: List[str]) -> List[str]:
        self._data[user_id] = list(favorites or [])
        return self._data[user_id]

    def add_favorite(self, user_id: str, env_id: str) -> List[str]:
        lst = self._data.setdefault(user_id, [])
        if env_id not in lst:
            lst.append(env_id)
        return list(lst)

    def remove_favorite(self, user_id: str, env_id: str) -> None:
        lst = self._data.get(user_id, [])
        try:
            lst.remove(env_id)
        except ValueError:
            pass


class TableUserProfileStore(_BaseStore):
    def __init__(self):
        if not TABLES_CONN:
            raise RuntimeError("Table storage connection not configured")
        from azure.data.tables import TableServiceClient

        svc = TableServiceClient.from_connection_string(TABLES_CONN)
        self._table = svc.get_table_client(USER_TABLE_NAME)
        try:
            self._table.create_table()
        except Exception:
            pass

    def _read_entity(self, user_id: str) -> Optional[Dict[str, Any]]:
        try:
            ent = self._table.get_entity(partition_key="users", row_key=user_id)
            data = ent.get("data")
            if isinstance(data, str):
                return json.loads(data)
            return data or {}
        except Exception:
            return None

    def get_favorites(self, user_id: str) -> List[str]:
        ent = self._read_entity(user_id)
        return ent.get("favorites", []) if ent else []

    def set_favorites(self, user_id: str, favorites: List[str]) -> List[str]:
        entity = {"PartitionKey": "users", "RowKey": user_id, "data": json.dumps({"favorites": list(favorites or [])}, ensure_ascii=False)}
        try:
            self._table.upsert_entity(entity=entity)
        except Exception:
            try:
                self._table.create_entity(entity=entity)
            except Exception:
                self._table.update_entity(mode="REPLACE", entity=entity)
        return list(favorites or [])

    def add_favorite(self, user_id: str, env_id: str) -> List[str]:
        cur = self.get_favorites(user_id)
        if env_id not in cur:
            cur.append(env_id)
            self.set_favorites(user_id, cur)
        return cur

    def remove_favorite(self, user_id: str, env_id: str) -> None:
        cur = self.get_favorites(user_id)
        if env_id in cur:
            cur.remove(env_id)
            self.set_favorites(user_id, cur)


class CosmosUserProfileStore(_BaseStore):
    def __init__(self):
        if not COSMOS_CONN:
            raise RuntimeError("Cosmos connection not configured")
        from azure.cosmos import CosmosClient, PartitionKey

        self.client = CosmosClient.from_connection_string(COSMOS_CONN)
        self._db = self.client.create_database_if_not_exists(id=COSMOS_DB)
        self._container = self._db.create_container_if_not_exists(id=COSMOS_CONTAINER, partition_key=PartitionKey(path="/id"))

    def _get_item(self, user_id: str) -> Optional[Dict[str, Any]]:
        try:
            items = list(self._container.query_items(query="SELECT * FROM c WHERE c.id = @id", parameters=[{"name":"@id","value":user_id}], enable_cross_partition_query=True))
            return items[0] if items else None
        except Exception:
            return None

    def get_favorites(self, user_id: str) -> List[str]:
        item = self._get_item(user_id)
        return item.get("favorites", []) if item else []

    def set_favorites(self, user_id: str, favorites: List[str]) -> List[str]:
        payload = {"id": user_id, "favorites": list(favorites or [])}
        self._container.upsert_item(payload)
        return payload["favorites"]

    def add_favorite(self, user_id: str, env_id: str) -> List[str]:
        cur = self.get_favorites(user_id)
        if env_id not in cur:
            cur.append(env_id)
            self.set_favorites(user_id, cur)
        return cur

    def remove_favorite(self, user_id: str, env_id: str) -> None:
        cur = self.get_favorites(user_id)
        if env_id in cur:
            cur.remove(env_id)
            self.set_favorites(user_id, cur)


class _LazyUserProfileStore:
    def __init__(self):
        self._store: Optional[_BaseStore] = None

    def _ensure(self):
        if self._store is not None:
            return
        if COSMOS_CONN:
            try:
                self._store = CosmosUserProfileStore()
                return
            except Exception:
                self._store = None
        if TABLES_CONN:
            try:
                self._store = TableUserProfileStore()
                return
            except Exception:
                self._store = None
        # fallback to in-memory for dev/tests
        self._store = InMemoryUserProfileStore()

    def __getattr__(self, item):
        self._ensure()
        return getattr(self._store, item)


_lazy = _LazyUserProfileStore()


def get_user_profile_store() -> _LazyUserProfileStore:
    return _lazy
