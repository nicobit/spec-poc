from typing import Optional, Dict, Any
import anyio
from app.services.secret_service import SecretService

async def _sync_blob_ping(connection_string: Optional[str], endpoint: Optional[str], container: Optional[str]) -> Dict[str, Any]:
    from azure.identity import DefaultAzureCredential
    from azure.storage.blob import BlobServiceClient

    if not connection_string and not endpoint:
        return {"skipped": True, "reason": "Provide 'connection_string' or 'endpoint'"}

    if connection_string:
        bsc = BlobServiceClient.from_connection_string(connection_string)
    else:
        cred = SecretService.credential()
        bsc = BlobServiceClient(account_url=endpoint, credential=cred)

    if container:
        props = bsc.get_container_client(container).get_container_properties()
        etag = props.get("etag") if isinstance(props, dict) else getattr(props, "etag", None)
        return {"skipped": False, "method": "get_container_properties", "etag": etag}
    else:
        try:
            _ = bsc.get_service_properties()
            return {"skipped": False, "method": "get_service_properties"}
        except Exception:
            containers = bsc.list_containers(results_per_page=1)
            first = next(iter(containers), None)
            name = first.get("name") if isinstance(first, dict) else getattr(first, "name", None)
            return {"skipped": False, "method": "list_containers", "first_container": name}

async def check_storage_blob(connection_string: Optional[str], endpoint: Optional[str], container: Optional[str]) -> Dict[str, Any]:
    return await anyio.to_thread.run_sync(_sync_blob_ping, connection_string, endpoint, container)
