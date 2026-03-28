from typing import Dict, Any, Optional, Tuple
import json
from azure.identity.aio import DefaultAzureCredential
from azure.storage.blob.aio import BlobServiceClient
from azure.core.exceptions import ResourceNotFoundError
from .base import ConfigRepository

class BlobConfigRepository(ConfigRepository):
    def __init__(self, account_url: Optional[str], container: str, blob_name: str, connection_string: Optional[str] = None):
        self.account_url = account_url
        self.container = container
        self.blob_name = blob_name
        self.connection_string = connection_string
        self._client = None
        self._cred = None

    async def _get_blob_client(self):
        if self.connection_string:
            bsc = BlobServiceClient.from_connection_string(self.connection_string)
        else:
            self._cred = DefaultAzureCredential(exclude_visual_studio_code_credential=False)
            bsc = BlobServiceClient(account_url=self.account_url, credential=self._cred)
        container_client = bsc.get_container_client(self.container)
        try:
            await container_client.create_container()
        except Exception as e:
            # Ignore error if container already exists
            if "ContainerAlreadyExists" not in str(e):
                raise
        return container_client.get_blob_client(self.blob_name)

    async def get_config(self) -> Tuple[Dict[str, Any], Optional[str]]:
        blob = await self._get_blob_client()
        try:
            stream = await blob.download_blob()
            data = await stream.readall()
            cfg = json.loads(data.decode("utf-8"))
            props = await blob.get_blob_properties()
            return cfg, props.etag
        except ResourceNotFoundError:
            return {"services": [], "default_timeout_seconds": None}, None
        finally:
            if self._cred:
                await self._cred.close()

    async def save_config(self, data: Dict[str, Any], etag: Optional[str] = None) -> str:
        blob = await self._get_blob_client()
        # naive optimistic concurrency: check etag if provided
        if etag:
            try:
                props = await blob.get_blob_properties()
                if props.etag != etag:
                    raise Exception("ETagMismatch: config has changed on the server.")
            except ResourceNotFoundError:
                # if not found but client provided etag, that's also a mismatch
                raise Exception("ETagMismatch: config blob missing.")
        payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        await blob.upload_blob(payload, overwrite=True, content_type="application/json")
        props = await blob.get_blob_properties()
        if self._cred:
            await self._cred.close()
        return props.etag
