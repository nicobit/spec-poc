from typing import Optional
import os
from .base import ConfigRepository
from .blob_repo import BlobConfigRepository
from .file_repo import FileConfigRepository
from ..settings import settings

_repo_cache: Optional[ConfigRepository] = None

def get_repository() -> Optional[ConfigRepository]:
    global _repo_cache
    if _repo_cache is not None:
        return _repo_cache

    kind = (settings.CONFIG_REPOSITORY_KIND or "").lower()
    if kind == "blob":
        if not settings.CONFIG_BLOB_CONTAINER:
            return None
        _repo_cache = BlobConfigRepository(
            account_url=settings.CONFIG_BLOB_ACCOUNT_URL,
            container=settings.CONFIG_BLOB_CONTAINER,
            blob_name=settings.CONFIG_BLOB_NAME,
            connection_string=settings.CONFIG_BLOB_CONNECTION_STRING,
        )
        return _repo_cache

    if kind == "file":
        path = settings.CONFIG_FILE_PATH or settings.SERVICES_CONFIG_PATH
        if not path:
            return None
        _repo_cache = FileConfigRepository(path=path)
        return _repo_cache

    return None
