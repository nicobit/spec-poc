import azure.functions as func
from functools import lru_cache
from urllib.parse import urlparse

from fastapi import FastAPI, Request, Response
from pydantic import BaseModel
from shared.utils.nb_logger import NBLogger
from shared.utils.cors_helper import CORSHelper
from function_dashboard.dashboard_service import DashboardService
from shared.config.settings import (
    BLOB_STORAGE_CONNECTION_STRING_SECRET_NAME,
    DASHBOARD_PROXY_ALLOWED_HOSTS,
    DASHBOARD_PROXY_CACHE_TTL_SECONDS,
    DASHBOARD_TABLE_NAME,
    KEY_VAULT_CORE_URI,
)
from shared.services.secret_service import SecretService
from shared.context import get_current_user, get_user_id_from_claims
import httpx
import time

logger = NBLogger().Log()
fast_app = FastAPI()
CORSHelper.set_CORS(fast_app)

STOCK_RESULTS = {}  # Dictionary to store results per URL
LAST_FETCH_TIMES = {}  # Dictionary to store fetch times per URL
ALLOWED_PROXY_HOSTS = {
    host.strip().lower()
    for host in DASHBOARD_PROXY_ALLOWED_HOSTS.split(",")
    if host.strip()
}


@lru_cache(maxsize=1)
def get_dashboard_service() -> DashboardService:
    blob_connection_string = SecretService.get_secret_value(
        KEY_VAULT_CORE_URI,
        BLOB_STORAGE_CONNECTION_STRING_SECRET_NAME,
    )
    return DashboardService(
        connection_string=blob_connection_string,
        table_name=DASHBOARD_TABLE_NAME,
    )


def validate_proxy_url(url: str) -> str | None:
    try:
        parsed = urlparse(url)
    except Exception:
        return "Invalid URL."

    if parsed.scheme not in {"http", "https"}:
        return "Only http and https URLs are allowed."

    hostname = (parsed.hostname or "").lower()
    if not hostname:
        return "URL must include a hostname."

    if not ALLOWED_PROXY_HOSTS:
        return "Dashboard proxy is disabled because DASHBOARD_PROXY_ALLOWED_HOSTS is not configured."

    if hostname not in ALLOWED_PROXY_HOSTS:
        return f"Host '{hostname}' is not allowlisted."

    return None

@fast_app.get("/api/dashboard/") 
async def return_http_no_body(req: Request): 
    await get_current_user(req)
    return Response(content="Dashboard is working", media_type="text/plain") 


class DashboardData(BaseModel):
    tabs: list

# Example input structure for the `save_dashboard_data` endpoint:
# {
#     "content": {
#         "key1": "value1",
#         "key2": "value2",
#         ...
#     }
# }


@fast_app.get("/api/dashboard/data")
async def get_dashboard_data(req: Request):
    try:
        user = await get_current_user(req)
        user_id = get_user_id_from_claims(user)
        if not user_id:
            raise ValueError("Authenticated user has no identifiable id")
        data = get_dashboard_service().load_dashboard_data(user_id)
       
        return data
    except Exception as e:
        logger.error(f"Error fetching dashboard data: {e}")
        return Response(content="Error fetching dashboard data", status_code=500)


@fast_app.put("/api/dashboard/data")
async def save_dashboard_data(req:Request,dashboard_data: DashboardData):
    try:
        user = await get_current_user(req)
        user_id = get_user_id_from_claims(user)
        if not user_id:
            raise ValueError("Authenticated user has no identifiable id")
        if not dashboard_data.tabs or len(dashboard_data.tabs) == 0:
            return Response(content="No data provided", status_code=400)
        get_dashboard_service().save_dashboard_data(user_id, dashboard_data.tabs)
        
        return Response(content="Dashboard data saved successfully", status_code=200)
    except Exception as e:
        logger.error(f"Error saving dashboard data: {e}")
        return Response(content="Error saving dashboard data", status_code=500)
    
@fast_app.get("/api/dashboard/rssproxy")
async def get_rss_azure_update(req: Request, rssUrl: str):
    try:
        await get_current_user(req)
        validation_error = validate_proxy_url(rssUrl)
        if validation_error:
            return Response(content=validation_error, status_code=400)
        logger.info(f"Fetching RSS feed from: {rssUrl}")
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(rssUrl)
            response.raise_for_status()
            return Response(content=response.text, media_type="application/rss+xml")
    except httpx.RequestError as e:
        logger.error(f"An error occurred while requesting the RSS feed: {e}")
        return Response(content="Error fetching RSS feed", status_code=500)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return Response(content="Unexpected error occurred", status_code=500)


@fast_app.get("/api/dashboard/proxy")
async def proxy_content(req: Request, url: str):
    try:
        global STOCK_RESULTS, LAST_FETCH_TIMES
        await get_current_user(req)
        validation_error = validate_proxy_url(url)
        if validation_error:
            return Response(content=validation_error, status_code=400)
        logger.info(f"Proxying content from: {url}")
        
        current_time = time.time()

        # Check if the URL has been fetched recently
        if url not in STOCK_RESULTS or (
            current_time - LAST_FETCH_TIMES.get(url, 0) > DASHBOARD_PROXY_CACHE_TTL_SECONDS
        ):
            logger.info(f"Calling the service: {url}")
            headers = {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/91.0.4472.124 Safari/537.36"
                )
            }
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                STOCK_RESULTS[url] = response.content
                LAST_FETCH_TIMES[url] = current_time
        
        return Response(content=STOCK_RESULTS[url], media_type="application/octet-stream")
    except httpx.RequestError as e:
        logger.error(f"An error occurred while requesting the content: {e}")
        return Response(content="Error fetching content", status_code=500)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return Response(content="Unexpected error occurred", status_code=500)

   

async def main(req: func.HttpRequest, context: func.Context) -> func.HttpResponse:
    return await func.AsgiMiddleware(fast_app).handle_async(req, context)



