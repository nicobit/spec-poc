import asyncio
import time
import json
import hashlib
from typing import Any, Optional

try:
    import redis.asyncio as redis  # optional
except Exception:  # pragma: no cover
    redis = None

class InMemoryTTLCache:
    def __init__(self, ttl: int):
        self.ttl = ttl
        self._store: dict[str, tuple[float, Any]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        async with self._lock:
            row = self._store.get(key)
            if not row:
                return None
            ts, val = row
            if time.time() - ts > self.ttl:
                self._store.pop(key, None)
                return None
            return val

    async def set(self, key: str, value: Any):
        async with self._lock:
            self._store[key] = (time.time(), value)

    async def clear(self):
        async with self._lock:
            self._store.clear()

class RedisTTLCache:
    def __init__(self, url: str, ttl: int, prefix: str):
        if redis is None:
            raise RuntimeError("Install `redis` to use RedisTTLCache.")
        self.ttl = ttl
        self.prefix = prefix
        self._c = redis.from_url(url, decode_responses=False)

    def _k(self, key: str) -> str:
        return f"{self.prefix}{key}"

    async def get(self, key: str) -> Optional[Any]:
        b = await self._c.get(self._k(key))
        return None if not b else json.loads(b)

    async def set(self, key: str, value: Any):
        payload = json.dumps(value, separators=(",", ":")).encode("utf-8")
        await self._c.set(self._k(key), payload, ex=self.ttl)

    async def clear(self):
        cursor = "0"
        pat = self._k("*")
        while True:
            cursor, keys = await self._c.scan(cursor=cursor, match=pat, count=500)
            if keys:
                await self._c.delete(*keys)
            if cursor == "0":
                break

def canonical_key(endpoint: str, params: dict[str, Any]) -> str:
    """
    Stable key from endpoint + sorted params. Ignores no_cache and None values.
    Lowercases keys; trims strings.
    """
    norm: dict[str, Any] = {}
    for k, v in params.items():
        if k is None:
            continue
        kl = str(k).lower()
        if kl == "no_cache" or v is None:
            continue
        if isinstance(v, str):
            norm[kl] = v.strip()
        else:
            norm[kl] = v
    blob = json.dumps(norm, sort_keys=True, separators=(",", ":"))
    h = hashlib.sha256(blob.encode()).hexdigest()[:24]
    return f"{endpoint}:{h}"
