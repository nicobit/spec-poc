import os, json
from typing import Any, Dict, Tuple
from .repositories.factory import get_repository
from .settings import settings
from azure.identity.aio import DefaultAzureCredential
from azure.keyvault.secrets.aio import SecretClient

class ConfigResolutionError(Exception):
    pass


from typing import Optional, Dict, Any
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient


async def _get_kv_secret1(vault_uri: str, secret_name: str) -> str:
    cred = DefaultAzureCredential(exclude_visual_studio_code_credential=False)
    client = SecretClient(vault_url=vault_uri, credential=cred)
    try:
        secret = client.get_secret(secret_name)
        return secret.value
    finally:
        await client.close()
        await cred.close()

async def _get_kv_secret(vault_uri: str, secret_name: str) -> str:
    cred = DefaultAzureCredential(exclude_visual_studio_code_credential=False)
    client = SecretClient(vault_url=vault_uri, credential=cred)
    
    secret = client.get_secret(secret_name)
    return secret.value
    
  

async def resolve_field(field_spec: Dict[str, Any]) -> Any:
    if field_spec is None:
        return None
    source = (field_spec.get("source") or "").lower()
    if source == "inline":
        return field_spec.get("value")
    if source == "settings":
        key = field_spec.get("setting_name")
        if not key:
            raise ConfigResolutionError("settings source requires 'setting_name'")
        return os.environ.get(key)
    if source == "kv":
        kv = field_spec.get("key_vault") or {}
        vault_uri = kv.get("vault_uri")
        secret_name = kv.get("secret_name")
        if not vault_uri or not secret_name:
            raise ConfigResolutionError("kv source requires key_vault.vault_uri and key_vault.secret_name")
        return await _get_kv_secret(vault_uri, secret_name)
    raise ConfigResolutionError(f"Unknown source '{source}'")

async def load_services_config() -> Dict[str, Any]:
    # Prefer repository if configured
    repo = get_repository()
    if repo is not None:
        cfg, _ = await repo.get_config()
        return cfg or {"services": [], "default_timeout_seconds": None}

    # Fallback: path or inline JSON env
    path = settings.SERVICES_CONFIG_PATH or settings.CONFIG_FILE_PATH
    raw = settings.SERVICES_CONFIG_JSON
    if path and os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    if raw:
        return json.loads(raw)
    return {"services": [], "default_timeout_seconds": None}
