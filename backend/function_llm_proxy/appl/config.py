# app/config.py
import os
from functools import lru_cache

from shared.config.settings import (
    CLIENT_ID,
    COMPLETION_MODEL,
    EMBEDDING_MODEL,
    KEY_VAULT_CORE_URI,
    OPENAI_ENDPOINT_SECRET_NAME,
    OPENAI_KEY_SECRET_NAME,
    OPENAI_VERSION_SECRET_NAME,
    TENANT_ID,
)
from shared.services.secret_service import SecretService


def _read_optional_secret(vault_uri: str | None, secret_name: str | None) -> str:
    if not vault_uri or not secret_name:
        return ""

    try:
        return SecretService.get_secret_value(vault_uri, secret_name) or ""
    except Exception:
        return ""


class Settings:
    def __init__(self):
        client_id = CLIENT_ID or os.getenv("CLIENT_ID") or os.getenv("AZURE_CLIENT_ID")
        self.TENANT_ID: str | None = TENANT_ID or os.getenv("TENANT_ID") or os.getenv("AZURE_TENANT_ID")
        self.AUDIENCE: str = f"api://{client_id},{client_id}" if client_id else ""
        self.ALLOWED_TENANTS: str = os.getenv("ALLOWED_TENANTS", "*")

        self.AZURE_OPENAI_ENDPOINT: str = _read_optional_secret(KEY_VAULT_CORE_URI, OPENAI_ENDPOINT_SECRET_NAME)
        self.AZURE_OPENAI_API_VERSION: str = _read_optional_secret(KEY_VAULT_CORE_URI, OPENAI_VERSION_SECRET_NAME)
        self.AZURE_OPENAI_API_KEY: str = _read_optional_secret(KEY_VAULT_CORE_URI, OPENAI_KEY_SECRET_NAME)
        self.AZURE_OPENAI_KEY_VIA_KV: bool = os.getenv("AZURE_OPENAI_KEY_VIA_KV", "false").lower() == "false"
        self.KEY_VAULT_URI: str | None = KEY_VAULT_CORE_URI
        self.KEY_VAULT_SECRET_NAME: str | None = OPENAI_KEY_SECRET_NAME

        self.STORAGE_ACCOUNT_NAME: str = os.getenv("STORAGE_ACCOUNT_NAME", "")
        self.USAGE_TABLE_NAME: str = os.getenv("USAGE_TABLE_NAME", "UsageTokens")
        self.AUDIT_BLOB_CONTAINER: str = os.getenv("AUDIT_BLOB_CONTAINER", "auditlogs")
        self.ENABLE_BLOB_AUDIT: bool = os.getenv("ENABLE_BLOB_AUDIT", "false").lower() == "true"

        self.DEFAULT_DAILY_QUOTA: int = int(os.getenv("DEFAULT_DAILY_QUOTA", "200000"))
        self.ENFORCE_QUOTA: bool = os.getenv("ENFORCE_QUOTA", "true").lower() == "true"
        self.EMBEDDING_MODEL: str = EMBEDDING_MODEL
        self.COMPLETION_MODEL: str = COMPLETION_MODEL


@lru_cache()
def get_settings() -> Settings:
    return Settings()
