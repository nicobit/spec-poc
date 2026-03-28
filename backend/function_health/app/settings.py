import os
from typing import Optional

class Settings:
    
    DEFAULT_TIMEOUT_SECONDS: float = float(os.getenv("DEFAULT_TIMEOUT_SECONDS", 3.0))

    # JSON-driven services list
    SERVICES_CONFIG_JSON: Optional[str] = os.getenv("HEALTH_SERVICES_CONFIG_JSON")
    SERVICES_CONFIG_PATH: Optional[str] = os.getenv("HEALTH_SERVICES_CONFIG_PATH")

    # Repository selection
    CONFIG_REPOSITORY_KIND: Optional[str] = os.getenv("HEALTH_CONFIG_REPOSITORY_KIND")
    # Blob repo settings
    CONFIG_BLOB_ACCOUNT_URL: Optional[str] = os.getenv("HEALTH_CONFIG_BLOB_ACCOUNT_URL")
    CONFIG_BLOB_CONTAINER: Optional[str] = os.getenv("HEALTH_CONFIG_BLOB_CONTAINER")
    CONFIG_BLOB_NAME: str = os.getenv("HEALTH_CONFIG_BLOB_NAME", "services.json")
    CONFIG_BLOB_CONNECTION_STRING: Optional[str] = os.getenv("HEALTH_CONFIG_BLOB_CONNECTION_STRING")
    # File repo settings
    CONFIG_FILE_PATH: Optional[str] = os.getenv("HEALTH_CONFIG_FILE_PATH")

    # Back-compat envs (only used if no repo+JSON provided)
    ENABLED_CHECKS: str = os.getenv("HEALTH_ENABLED_CHECKS", "key_vault,ai_search,azure_openai,sql_db")

    # Azure Identity (optional)
    AZURE_TENANT_ID: Optional[str] = os.getenv("AZURE_TENANT_ID")
    AZURE_CLIENT_ID: Optional[str] = os.getenv("AZURE_CLIENT_ID")
    AZURE_CLIENT_SECRET: Optional[str] = os.getenv("AZURE_CLIENT_SECRET")

    # Legacy per-service envs (fallbacks)
    KEY_VAULT_URI: Optional[str] = os.getenv("KEY_VAULT_URI")
    KEY_VAULT_TEST_SECRET_NAME: Optional[str] = os.getenv("KEY_VAULT_TEST_SECRET_NAME")
    AI_SEARCH_ENDPOINT: Optional[str] = os.getenv("AI_SEARCH_ENDPOINT") 
    AI_SEARCH_INDEX: Optional[str] = os.getenv("AI_SEARCH_INDEX")
    AZURE_OPENAI_ENDPOINT: Optional[str] = os.getenv("AZURE_OPENAI_ENDPOINT")
    AZURE_OPENAI_API_VERSION: str = os.getenv("AZURE_OPENAI_API_VERSION", "2024-10-21")
    AOAI_LIVE_CALL: bool = os.getenv("AOAI_LIVE_CALL", "False").lower() == "true"
    AZURE_OPENAI_DEPLOYMENT: Optional[str] = os.getenv("AZURE_OPENAI_DEPLOYMENT")
    SQL_ODBC_CONNECTION_STRING: Optional[str] = os.getenv("SQL_ODBC_CONNECTION_STRING")

settings = Settings()
