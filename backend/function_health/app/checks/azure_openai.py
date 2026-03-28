from typing import Optional, Dict, Any
import httpx
from azure.identity import DefaultAzureCredential
from app.services.secret_service import SecretService


# It needs refactoring to use openai key, and potentially the openai sdk
async def check_azure_openai(endpoint: Optional[str], api_version: str, live_call: bool, deployment: Optional[str]) -> Dict[str, Any]:
    if not endpoint:
        return {"skipped": True, "reason": "AZURE_OPENAI_ENDPOINT not set"}

    credential = SecretService.credential()
    token = credential.get_token("https://management.azure.com/.default").token

    async with httpx.AsyncClient(timeout=5.0) as client:
        if live_call:
            if not deployment:
                return {"skipped": True, "reason": "AOAI_LIVE_CALL=True but AZURE_OPENAI_DEPLOYMENT not set"}
            # https://nicbit-openai.openai.azure.com/openai/deployments/gpt-35-turbo/chat/completions?api-version=2025-01-01-preview
            url = f"{endpoint}/openai/deployments/{deployment}/chat/completions?api-version={api_version}"
            payload = {"messages": [{"role": "user", "content": "ping"}], "max_tokens": 1}
            r = await client.post(url, headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}, json=payload)
            r.raise_for_status()
            obj = r.json()
            model = obj.get("model") or obj.get("id")
            return {"skipped": False, "method": "chat.completions", "model": model}
        else:
            url = f"{endpoint}/openai/deployments?api-version={api_version}"
            r = await client.get(url, headers={"Authorization": f"Bearer {token}"})
            r.raise_for_status()
            data = r.json()
            count = len(data.get("data", [])) if isinstance(data, dict) else None
            return {"skipped": False, "method": "list_deployments", "deployment_count": count}
