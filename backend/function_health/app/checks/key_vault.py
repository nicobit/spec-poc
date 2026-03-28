from typing import Optional, Dict, Any
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
from app.services.secret_service import SecretService

async def check_key_vault(vault_uri: Optional[str], test_secret: Optional[str]) -> Dict[str, Any]:
    if not vault_uri:
        return {"skipped": True, "reason": "KEY_VAULT_URI not set"}

    credential = SecretService.credential() 
    client = SecretClient(vault_url=vault_uri, credential=credential)
    
    if test_secret:
        secret = client.get_secret(test_secret)
        return {"skipped": False, "method": "get_secret", "id": secret.id}
    else:
        pager = client.list_properties_of_secrets()
        for first in pager:
            return {"skipped": False, "method": "list_properties", "first_secret_name": getattr(first, "name", None)}
        return {"skipped": False, "method": "list_properties", "first_secret_name": None}

