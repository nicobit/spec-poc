# app/services/openai_client.py
import json
from typing import Dict, Any, Optional, AsyncIterator
import httpx
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
from function_llm_proxy.appl.config import get_settings

class OpenAIClient:
    def __init__(self):
        self.s = get_settings()
        self._cached_key: Optional[str] = None

    def _get_api_key(self) -> str:
        if self._cached_key:
            return self._cached_key

        if self.s.AZURE_OPENAI_KEY_VIA_KV and self.s.KEY_VAULT_URI:
            cred = DefaultAzureCredential()
            sc = SecretClient(self.s.KEY_VAULT_URI, cred)
            sec = sc.get_secret(self.s.KEY_VAULT_SECRET_NAME)
            self._cached_key = sec.value
            return self._cached_key

        if not self.s.AZURE_OPENAI_API_KEY:
            raise RuntimeError("No Azure OpenAI key configured.")
        self._cached_key = self.s.AZURE_OPENAI_API_KEY
        return self._cached_key

    async def post_json(self, path: str, params: Dict[str, Any], body: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.s.AZURE_OPENAI_ENDPOINT}{path}"
        headers = {
            "api-key": self._get_api_key(),
            "content-type": "application/json"
        }
        async with httpx.AsyncClient(timeout=None) as client:
            resp = await client.post(url, params=params, headers=headers, content=json.dumps(body))
            resp.raise_for_status()
            return resp.json()

    async def stream(self, path: str, params: Dict[str, Any], body: Dict[str, Any]) -> AsyncIterator[bytes]:
        url = f"{self.s.AZURE_OPENAI_ENDPOINT}{path}"
        headers = {
            "api-key": self._get_api_key(),
            "content-type": "application/json"
        }
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", url, params=params, headers=headers, content=json.dumps(body)) as resp:
                resp.raise_for_status()
                async for chunk in resp.aiter_bytes():
                    yield chunk
