from typing import Dict, Any, Optional, Tuple
import json, os
from .base import ConfigRepository

class FileConfigRepository(ConfigRepository):
    def __init__(self, path: str):
        self.path = path

    async def get_config(self) -> Tuple[Dict[str, Any], Optional[str]]:
        if not self.path or not os.path.exists(self.path):
            return {"services": [], "default_timeout_seconds": None}, None
        with open(self.path, "r", encoding="utf-8") as f:
            cfg = json.load(f)
        # naive etag: file mtime
        etag = str(os.path.getmtime(self.path))
        return cfg, etag

    async def save_config(self, data: Dict[str, Any], etag: Optional[str] = None) -> str:
        # naive etag check
        if etag and os.path.exists(self.path):
            current = str(os.path.getmtime(self.path))
            if current != etag:
                raise Exception("ETagMismatch: local file modified")
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return str(os.path.getmtime(self.path))
