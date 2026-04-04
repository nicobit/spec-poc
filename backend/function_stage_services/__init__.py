"""Azure Function adapter exposing stage -> Azure services endpoint.

Routes:
  GET /api/stages/{stage_id}/azure-services

This endpoint returns a compact JSON summary from `app.services.azure_stage_services.get_stage_services`.
"""
import azure.functions as func
from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
from shared.context import get_current_user
from shared.utils.nb_logger import NBLogger
from app.services.azure_stage_services import get_stage_services

logger = NBLogger().Log()
fast_app = FastAPI()


@fast_app.get("/api/stages/{stage_id}/azure-services")
async def stage_azure_services(stage_id: str, req: Request, include_failures: bool = True, lookback_days: int = 7, realtime: bool = False):
    try:
        user = await get_current_user(req)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Auth error: %s", exc)
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        result = get_stage_services(stage_id, include_failures=include_failures, lookback_days=lookback_days, realtime=realtime)
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Azure services lookup failed: %s", exc)
        raise HTTPException(status_code=503, detail="Azure service unavailable")


async def main(req: func.HttpRequest, context: func.Context) -> func.HttpResponse:
    return await func.AsgiMiddleware(fast_app).handle_async(req, context)
