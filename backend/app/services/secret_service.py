from azure.identity import ManagedIdentityCredential
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
from app.utils.nb_logger import NBLogger
from app.settings import  TENANT_ID as TENANT
import os


logger = NBLogger().Log()

class SecretService:
    _cache = {}

    @staticmethod
    def credential():
        """Create Managed Identity credential if using managed identity."""

        VSCODE = os.getenv("VSCODE", "").strip().lower() == "true"
        if VSCODE:
            print("Using DefaultAzureCredential for local development")
            logger.info("Using DefaultAzureCredential for local development")
            return DefaultAzureCredential(
                # keep local chain simple
                exclude_managed_identity_credential=True,
                exclude_shared_token_cache_credential=True,
                # let dev creds issue tokens for your tenant
                additionally_allowed_tenants=[TENANT],   # or ["*"] to allow any
                # (optional) be explicit about VS Code/broker tenant
                visual_studio_code_tenant_id=TENANT,
                broker_tenant_id=TENANT,
            )
        else:
            print("Using ManagedIdentityCredential for production")
            logger.info("Using ManagedIdentityCredential for production")
            return ManagedIdentityCredential()
       

    @staticmethod
    def get_secret_value(vault_url: str, secret_name: str) -> str:
        """Retrieve the secret value from Azure Key Vault, with caching."""
        cache_key = (vault_url, secret_name)
        if cache_key in SecretService._cache:
            return SecretService._cache[cache_key]

        try:
            credential = SecretService.credential()
            client = SecretClient(vault_url=vault_url, credential=credential)
            secret = client.get_secret(secret_name)
            SecretService._cache[cache_key] = secret.value
            return secret.value
        except Exception as e:
            print(f"Error retrieving secret {secret_name} from Key Vault: {e}")
            logger.error(f"Error retrieving secret {secret_name} from Key Vault: {e}")
            #raise SecretServiceError(f"Error retrieving secret {secret_name} from Key Vault") from e
