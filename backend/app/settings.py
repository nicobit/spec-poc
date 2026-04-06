from functools import lru_cache
from typing import Optional

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AppSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        case_sensitive=False,
    )

    azure_tenant_id: Optional[str] = Field(default=None, alias="AZURE_TENANT_ID")
    azure_client_id: Optional[str] = Field(default=None, alias="AZURE_CLIENT_ID")
    audience: Optional[str] = Field(default=None, alias="AUDIENCE")

    connection_string_retriever: str = Field(default="keyvault", alias="CONNECTION_STRING_RETRIEVER")
    key_vault_uri: str = Field(default="", alias="KEY_VAULT_URI")
    odbc_driver: str = Field(default="ODBC Driver 17 for SQL Server", alias="ODBC_DRIVER")
    database_dns_secret_name: str = Field(default="", alias="DATABASE_DNS_SECRET_NAME")
    password_secret_name: str = Field(default="", alias="PASSWORD_SECRET_NAME")
    username_secret_name: str = Field(default="", alias="USERNAME_SECRET_NAME")
    database_name: str = Field(default="", alias="DATABASE_NAME")
    blob_storage_connection_string_secret_name: Optional[str] = Field(
        default=None,
        alias="BLOB_STORAGE_CONNECTION_STRING_SECRET_NAME",
    )
    sql_connection_string: str = Field(default="", alias="SQL_CONNECTION_STRING")
    sql_connection_string_secret_name: str = Field(default="", alias="SQL_CONNECTION_STRING_SECRET_NAME")

    key_vault_core_uri: Optional[str] = Field(default=None, alias="KEY_VAULT_CORE_URI")

    openai_key_secret_name: Optional[str] = Field(default=None, alias="AZURE_OPENAI_KEY_SECRET_NAME")
    openai_endpoint_secret_name: Optional[str] = Field(default=None, alias="AZURE_OPENAI_ENDPOINT_SECRET_NAME")
    openai_version_secret_name: Optional[str] = Field(default=None, alias="AZURE_OPENAI_VERSION_SECRET_NAME")
    embedding_model: str = Field(
        default="text-embedding-ada-002",
        validation_alias=AliasChoices("EMBEDDING_MODEL", "EMDEDDING_MODEL"),
    )
    completion_model: str = Field(default="gpt-35-turbo", alias="COMPLETION_MODEL")

    search_index_name: str = Field(default="nl-to-sql", alias="AZURE_SEARCH_INDEX_NAME")
    search_service_endpoint_secret_name: Optional[str] = Field(
        default=None,
        alias="AZURE_SEARCH_SERVICE_ENDPOINT_SECRET_NAME",
    )
    search_api_key_secret_name: Optional[str] = Field(default=None, alias="AZURE_SEARCH_API_KEY_SECRET_NAME")

    rows_limit: int = Field(default=100, alias="ROWS_LIMIT")
    cors_allowed_origins: str = Field(
        default="http://localhost:3000,http://localhost:5173,http://localhost:5174,http://example.com",
        alias="CORS_ALLOWED_ORIGINS",
    )
    applicationinsights_connection_string: Optional[str] = Field(
        default=None,
        alias="APPLICATIONINSIGHTS_CONNECTION_STRING",
    )

    memory_search_index_name: str = Field(default="memory-index", alias="MEMORY_SEARCH_INDEX_NAME")
    memory_search_service_endpoint_secret_name: Optional[str] = Field(
        default=None,
        alias="MEMORY_SEARCH_SERVICE_ENDPOINT_SECRET_NAME",
    )
    memory_search_api_key_secret_name: Optional[str] = Field(
        default=None,
        alias="MEMORY_SEARCH_API_KEY_SECRET_NAME",
    )
    redis_connection_string_secret_name: str = Field(
        default="",
        validation_alias=AliasChoices("REDIS_CONNECTION_STRING_SECRET_NAME", "REDIS_COONECTION_STRING_SECRET_NAME"),
    )

    dashboard_table_name: str = Field(default="dashboard", alias="DASHBOARD_TABLE_NAME")
    dashboard_proxy_allowed_hosts: str = Field(default="", alias="DASHBOARD_PROXY_ALLOWED_HOSTS")
    dashboard_proxy_cache_ttl_seconds: int = Field(default=900, alias="DASHBOARD_PROXY_CACHE_TTL_SECONDS")

    schedule_store_backend: str = Field(default="table", alias="SCHEDULE_STORE_BACKEND")
    schedule_table_name: str = Field(default="schedules", alias="SCHEDULE_TABLE_NAME")
    schedule_table_connection_string: Optional[str] = Field(default=None, alias="SCHEDULE_TABLE_CONNECTION_STRING")


@lru_cache(maxsize=1)
def get_settings() -> AppSettings:
    settings = AppSettings()

    # If AUDIENCE is not explicitly set, default to the API App ID URI
    # derived from the configured client id. This keeps local config
    # minimal while allowing explicit override when needed.
    if not settings.audience and settings.azure_client_id:
        settings.audience = f"api://{settings.azure_client_id}"

    if not settings.memory_search_service_endpoint_secret_name:
        settings.memory_search_service_endpoint_secret_name = settings.search_service_endpoint_secret_name
    if not settings.memory_search_api_key_secret_name:
        settings.memory_search_api_key_secret_name = settings.search_api_key_secret_name

    return settings


settings = get_settings()

# Backward-compatible exports for existing imports across the codebase.
TENANT_ID = settings.azure_tenant_id
CLIENT_ID = settings.azure_client_id
AUDIENCE = settings.audience

CONNECTION_STRING_RETRIEVER = settings.connection_string_retriever
KEY_VAULT_URI = settings.key_vault_uri
ODBC_DRIVER = settings.odbc_driver
DATABASE_DNS_SECRET_NAME = settings.database_dns_secret_name
PASSWORD_SECRET_NAME = settings.password_secret_name
USERNAME_SECRET_NAME = settings.username_secret_name
DATABASE_NAME = settings.database_name
BLOB_STORAGE_CONNECTION_STRING_SECRET_NAME = settings.blob_storage_connection_string_secret_name
SQL_CONNECTION_STRING = settings.sql_connection_string
SQL_CONNECTION_STRING_SECRET_NAME = settings.sql_connection_string_secret_name

KEY_VAULT_CORE_URI = settings.key_vault_core_uri

OPENAI_KEY_SECRET_NAME = settings.openai_key_secret_name
OPENAI_ENDPOINT_SECRET_NAME = settings.openai_endpoint_secret_name
OPENAI_VERSION_SECRET_NAME = settings.openai_version_secret_name
EMBEDDING_MODEL = settings.embedding_model
COMPLETION_MODEL = settings.completion_model

SEARCH_INDEX_NAME = settings.search_index_name
SEARCH_SERVICE_ENDPOINT_SECRET_NAME = settings.search_service_endpoint_secret_name
SEARCH_API_KEY_SECRET_NAME = settings.search_api_key_secret_name

ROWS_LIMIT = settings.rows_limit
CORS_ALLOWED_ORIGINS = settings.cors_allowed_origins
APPLICATIONINSIGHTS_CONNECTION_STRING = settings.applicationinsights_connection_string

MEMORY_SEARCH_INDEX_NAME = settings.memory_search_index_name
MEMORY_SEARCH_SERVICE_ENDPOINT_SECRET_NAME = settings.memory_search_service_endpoint_secret_name
MEMORY_SEARCH_API_KEY_SECRET_NAME = settings.memory_search_api_key_secret_name
REDIS_COONECTION_STRING_SECRET_NAME = settings.redis_connection_string_secret_name
REDIS_CONNECTION_STRING_SECRET_NAME = settings.redis_connection_string_secret_name

DASHBOARD_TABLE_NAME = settings.dashboard_table_name
DASHBOARD_PROXY_ALLOWED_HOSTS = settings.dashboard_proxy_allowed_hosts
DASHBOARD_PROXY_CACHE_TTL_SECONDS = settings.dashboard_proxy_cache_ttl_seconds
