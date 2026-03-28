from typing import Optional, Dict, Any
from azure.identity import DefaultAzureCredential
from azure.search.documents.aio import SearchClient
from app.services.secret_service import SecretService

async def check_ai_search(endpoint: Optional[str], index_name: Optional[str]) -> Dict[str, Any]:
    if not endpoint or not index_name:
        return {"skipped": True, "reason": "AI_SEARCH_ENDPOINT or AI_SEARCH_INDEX not set"}

    credential = SecretService.credential()
    client = SearchClient(endpoint=endpoint, index_name=index_name, credential=credential)
    try:
        count = await client.get_document_count()
        return {"skipped": False, "document_count": int(count)}
    finally:
        await client.close()
