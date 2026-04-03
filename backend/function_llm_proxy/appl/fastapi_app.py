# app/fastapi_app.py
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import JSONResponse, StreamingResponse
from datetime import datetime, date
from typing import Dict, Any, Optional
from urllib.parse import urlencode

from function_llm_proxy.appl.middleware.correlation import CorrelationIdMiddleware
from function_llm_proxy.appl.config import get_settings
from shared.auth.jwt import get_validator
from function_llm_proxy.appl.services.usage_service import UsageService
from function_llm_proxy.appl.services.openai_client import OpenAIClient
from function_llm_proxy.appl.models.schemas import ChatCompletionRequest, EmbeddingsRequest
from function_llm_proxy.appl.utils.token_counter import estimate_prompt_tokens
from shared.utils.nb_logger import NBLogger

logger = NBLogger().Log()

def create_fastapi_app() -> FastAPI:
    app = FastAPI(title="Azure OpenAI Proxy (Functions + FastAPI)")

    app.add_middleware(CorrelationIdMiddleware)

    settings = get_settings()
    usage = UsageService()
    openai = OpenAIClient()
    validator = get_validator()

    async def get_user(request: Request) -> Dict[str, Any]:
        try:
            v = await validator.validate(request.headers.get("Authorization"))
            return v
        except PermissionError as e:
            raise HTTPException(status_code=401, detail=str(e))
        except Exception as e:
            logger.error(f"Unexpected auth error: {e}")
            raise HTTPException(status_code=401, detail="Unauthorized")

    @app.get("/api/llm/healthz")
    async def healthz(user=Depends(get_user)):
        return {"status": "ok", "time": datetime.utcnow().isoformat()}

    # ----- USAGE/QUOTA APIS -----
    @app.get("/api/llm/usage/today")
    async def get_today(user=Depends(get_user)):
        row = usage.get_today(user["user_id"])
        return row

    @app.get("/api/llm/usage/range")
    async def get_usage_range(from_date: str, to_date: str, user=Depends(get_user)):
        try:
            f = date.fromisoformat(from_date)
            t = date.fromisoformat(to_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format (YYYY-MM-DD).")
        rows = usage.get_range(user["user_id"], f, t)
        # Aggregate
        agg_prompt = sum(int(r.get("prompt_tokens", 0)) for r in rows)
        agg_completion = sum(int(r.get("completion_tokens", 0)) for r in rows)
        return {
            "user_id": user["user_id"],
            "from_date": from_date,
            "to_date": to_date,
            "total_prompt_tokens": agg_prompt,
            "total_completion_tokens": agg_completion,
            "total_tokens": agg_prompt + agg_completion,
            "daily": rows
        }

    @app.put("/api/llm/quota/{target_user_id}")
    async def set_quota(target_user_id: str, quota: int, user=Depends(get_user)):
        # Simple allow-all for demo; in prod, restrict by role/claim
        usage.set_quota(target_user_id, quota)
        return {"user_id": target_user_id, "quota": quota}

    # ----- OPENAI-COMPATIBLE ENDPOINTS -----

    # Chat Completions (Azure-style): /openai/deployments/{deployment}/chat/completions?api-version=...
    @app.post("/api/llm/openai/deployments/{deployment}/chat/completions")
    async def chat_completions(deployment: str, request: Request, user=Depends(get_user)):
        # Enforce quota BEFORE call (approximate, using prompt estimate)
        body_json = await request.json()
        req = ChatCompletionRequest(**body_json)
        model = req.model or deployment

        # preliminary estimate to block obviously over-quota calls
        try:
            usage.check_quota_or_raise(user["user_id"])
        except PermissionError as e:
            raise HTTPException(status_code=429, detail=str(e))

        params = {
            "api-version": request.query_params.get("api-version", settings.AZURE_OPENAI_API_VERSION)
        }

        path = f"/openai/deployments/{deployment}/chat/completions"

        # Forward either streaming or non-streaming
        if req.stream:
            # Stream chunks from AOAI; usage is reported in final chunk (we'll also parse & tally if found)
            async def streamer():
                prompt_tokens_est = estimate_prompt_tokens(req.messages, model=model)
                completion_tokens_real = 0
                prompt_tokens_real = 0
                async for chunk in openai.stream(path, params, body_json):
                    # Pass-through
                    yield chunk
                    # Try to detect usage in final JSON event
                    try:
                        text = chunk.decode("utf-8", errors="ignore")
                        if '"usage"' in text:
                            # Very lightweight parse to avoid buffering everything
                            # This is best-effort; non-fatal if it fails
                            # Example piece: ..."usage":{"prompt_tokens":X,"completion_tokens":Y,"total_tokens":Z}...
                            import re
                            m = re.search(r'"usage"\s*:\s*\{\s*"prompt_tokens"\s*:\s*(\d+)\s*,\s*"completion_tokens"\s*:\s*(\d+)', text)
                            if m:
                                prompt_tokens_real = int(m.group(1))
                                completion_tokens_real = int(m.group(2))
                    except Exception:
                        pass
                # Finalize usage (prefer real, else estimate)
                final_prompt = prompt_tokens_real or prompt_tokens_est
                usage.add_usage(user["user_id"], final_prompt, completion_tokens_real, model)

            return StreamingResponse(streamer(), media_type="text/event-stream")

        # Non-streaming
        aoai_resp = await openai.post_json(path, params, body_json)
        usage_info = aoai_resp.get("usage") or {}
        prompt_tokens = int(usage_info.get("prompt_tokens") or estimate_prompt_tokens(req.messages, model=model))
        completion_tokens = int(usage_info.get("completion_tokens") or 0)
        usage.add_usage(user["user_id"], prompt_tokens, completion_tokens, model)
        return JSONResponse(aoai_resp)

    # Embeddings: /openai/deployments/{deployment}/embeddings?api-version=...
    @app.post("/api/llm/openai/deployments/{deployment}/embeddings")
    async def embeddings(deployment: str, request: Request, user=Depends(get_user)):
        body_json = await request.json()
        req = EmbeddingsRequest(**body_json)
        params = {
            "api-version": request.query_params.get("api-version", settings.AZURE_OPENAI_API_VERSION)
        }
        path = f"/openai/deployments/{deployment}/embeddings"

        aoai_resp = await openai.post_json(path, params, body_json)
        usage_info = aoai_resp.get("usage") or {}
        prompt_tokens = int(usage_info.get("prompt_tokens") or 0)
        completion_tokens = int(usage_info.get("completion_tokens") or 0)
        model = req.model or deployment
        # Some embeddings responses only return prompt_tokens
        total_completion = completion_tokens
        usage.add_usage(user["user_id"], prompt_tokens, total_completion, model)
        return JSONResponse(aoai_resp)

    # Compatibility helper: a simple alias for "completions" (if needed)
    @app.post("/api/llm/v1/chat/completions")
    async def openai_like_chat(request: Request, user=Depends(get_user)):
        # For SDKs that call OpenAI-style paths; route to your default deployment
        default_deployment = "gpt-4o-mini"  # adjust or read from env
        # proxy call against Azure-style route
        q = urlencode({"api-version": settings.AZURE_OPENAI_API_VERSION})
        scope = f"/openai/deployments/{default_deployment}/chat/completions?{q}"
        body = await request.json()
        aoai_resp = await openai.post_json(
            path=f"/openai/deployments/{default_deployment}/chat/completions",
            params={"api-version": settings.AZURE_OPENAI_API_VERSION},
            body=body
        )
        usage_info = aoai_resp.get("usage") or {}
        pt = int(usage_info.get("prompt_tokens") or estimate_prompt_tokens(body.get("messages", []), model=default_deployment))
        ct = int(usage_info.get("completion_tokens") or 0)
        usage.add_usage(user["user_id"], pt, ct, default_deployment)
        return JSONResponse(aoai_resp)

    return app
