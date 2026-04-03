import azure.functions as func
from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
from shared.context import get_current_user
from shared.utils.nb_logger import NBLogger
from shared.client_store import get_client
from shared.environment_store import get_environment, list_environments
from shared.scheduler_store import SCHEDULES
from shared.execution_store import list_stage_executions_for_schedule, get_stage_execution_store
from app.services.llm.openai_service import OpenAIService
from app.services.llm.prompt_manager import PromptManager
from app.services.llm.schemas import AiAnswerModel
from .redaction import redact_text
import json
import re
import os
from pathlib import Path

logger = NBLogger().Log()
fast_app = FastAPI()


class ChatRequest(BaseModel):
    message: str
    filters: dict | None = None
    includeRemediation: bool = True


def _find_schedule(schedule_id: str):
    for s in SCHEDULES:
        if s.get("id") == schedule_id or s.get("stage_id") == schedule_id:
            return s
    return None


def _sanitize_client(client: dict | None):
    if not client:
        return None
    sanitized = dict(client)
    # redact client admin emails/ids
    admins = sanitized.get("clientAdmins") or []
    sanitized_admins = []
    for a in admins:
        safe = dict(a)
        if safe.get("id") and "@" in safe.get("id"):
            safe["id"] = "<redacted>"
        sanitized_admins.append(safe)
    sanitized["clientAdmins"] = sanitized_admins
    return sanitized


def _build_result_data(question: str, filters: dict | None):
    pieces = []
    # include filters echo
    pieces.append(f"Question: {question}")
    if filters:
        pieces.append(f"Filters: {json.dumps(filters)}")

    schedule = None
    skip_executions = False

    # environment filter resolution
    env_filter_id = filters.get("environmentId") if filters else None
    env_filter_name = filters.get("environmentName") if filters else None
    matched_env = None
    if env_filter_id:
        matched_env = get_environment(env_filter_id)
    elif env_filter_name:
        for e in list_environments():
            if e.get("name") and e.get("name").lower() == env_filter_name.lower():
                matched_env = e
                break
    if matched_env:
        pieces.append("Environment filter applied:")
        pieces.append(json.dumps({"id": matched_env.get("id"), "name": matched_env.get("name"), "status": matched_env.get("status")}, indent=2))
    if filters and filters.get("scheduleId"):
        schedule = _find_schedule(filters.get("scheduleId"))
        if schedule:
            # if environment filter present, enforce match or note mismatch
            if matched_env:
                sched_env_id = schedule.get("environment_id") or schedule.get("environment")
                name_matches = env_filter_name and ((schedule.get("environment") or "").lower() == env_filter_name.lower())
                id_matches = env_filter_id and schedule.get("environment_id") == env_filter_id
                if (env_filter_id and not id_matches) or (env_filter_name and not name_matches and not id_matches):
                    pieces.append("Note: requested schedule exists in a different environment than requested filter.")
                    pieces.append(f"Requested schedule {schedule.get('id')} is in environment {schedule.get('environment')} which does not match requested environment {env_filter_id or env_filter_name}.")
                    pieces.append("Schedule summary:")
                    pieces.append(json.dumps({
                        "id": schedule.get("id"),
                        "clientId": schedule.get("client_id"),
                        "environment": schedule.get("environment"),
                        "next_run": schedule.get("next_run"),
                        "enabled": schedule.get("enabled")
                    }, indent=2))
                    # avoid including executions from other environments
                    skip_executions = True
                else:
                    pieces.append("Schedule summary:")
                    pieces.append(json.dumps({
                        "id": schedule.get("id"),
                        "clientId": schedule.get("client_id"),
                        "environment": schedule.get("environment"),
                        "next_run": schedule.get("next_run"),
                        "enabled": schedule.get("enabled")
                    }, indent=2))
            else:
                pieces.append("Schedule summary:")
                pieces.append(json.dumps({
                    "id": schedule.get("id"),
                    "clientId": schedule.get("client_id"),
                    "environment": schedule.get("environment"),
                    "next_run": schedule.get("next_run"),
                    "enabled": schedule.get("enabled")
                }, indent=2))

    # client
    client = None
    if filters and filters.get("clientId"):
        client = get_client(filters.get("clientId"))
        pieces.append("Client summary:")
        pieces.append(json.dumps(_sanitize_client(client), indent=2))
    elif schedule and schedule.get("client_id"):
        client = get_client(schedule.get("client_id"))
        pieces.append("Client inferred from schedule:")
        pieces.append(json.dumps(_sanitize_client(client), indent=2))

    # environment
    if schedule and schedule.get("environment_id"):
        env = get_environment(schedule.get("environment_id"))
        if env:
            pieces.append("Environment summary:")
            pieces.append(json.dumps({"id": env.get("id"), "name": env.get("name"), "status": env.get("status")}, indent=2))
    elif matched_env:
        # include environment summary when filter used and no specific schedule
        pieces.append("Environment summary:")
        pieces.append(json.dumps({"id": matched_env.get("id"), "name": matched_env.get("name"), "status": matched_env.get("status")}, indent=2))

    # recent executions / failures
    if schedule and not skip_executions:
        # try in-memory first
        try:
            executions = list_stage_executions_for_schedule(schedule.get("id"), limit=10)
        except Exception:
            store = get_stage_execution_store()
            executions = store.list_stage_executions_for_schedule(schedule.get("id"), limit=10) if store else []
        pieces.append("Recent executions (truncated):")
        # include only timestamp and status and error messages
        short = []
        for e in executions:
            short.append({
                "executionId": e.get("executionId") or e.get("id"),
                "requestedAt": e.get("requestedAt"),
                "status": e.get("status"),
                "error": e.get("error")
            })
        pieces.append(json.dumps(short, indent=2))

    # if no specific schedule but an environment filter exists, include schedules and aggregated executions for that environment
    if not schedule and matched_env:
        env_id = matched_env.get("id")
        # find schedules in environment
        schedules_in_env = [s for s in SCHEDULES if (s.get("environment_id") == env_id) or ((s.get("environment") or "").lower() == (env_filter_name or "").lower())]
        if schedules_in_env:
            pieces.append("Schedules in requested environment:")
            brief = []
            for s in schedules_in_env:
                brief.append({"id": s.get("id"), "clientId": s.get("client_id"), "stageId": s.get("stage_id"), "next_run": s.get("next_run"), "enabled": s.get("enabled")})
            pieces.append(json.dumps(brief, indent=2))

            # aggregate recent executions across these schedules (limit 10)
            pieces.append("Recent executions (truncated):")
            short = []
            for s in schedules_in_env:
                try:
                    executions = list_stage_executions_for_schedule(s.get("id"), limit=10)
                except Exception:
                    store = get_stage_execution_store()
                    executions = store.list_stage_executions_for_schedule(s.get("id"), limit=10) if store else []
                for e in executions:
                    if len(short) >= 10:
                        break
                    short.append({
                        "executionId": e.get("executionId") or e.get("id"),
                        "requestedAt": e.get("requestedAt"),
                        "status": e.get("status"),
                        "error": e.get("error"),
                        "scheduleId": s.get("id"),
                    })
                if len(short) >= 10:
                    break
            pieces.append(json.dumps(short, indent=2))

    return "\n\n".join(pieces)


@fast_app.post("/api/ai/chat")
async def ai_chat(req: Request, body: ChatRequest):
    # authorize
    try:
        user = await get_current_user(req)
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error("Auth error: %s", e)
        raise HTTPException(status_code=401, detail="Unauthorized")

    # build context
    filters = body.filters or {}
    result_data = _build_result_data(body.message, filters)
    # redact potential PII before including in prompt (allowlist via env AI_REDACTION_ALLOWLIST)
    result_data = redact_text(result_data)

    # Build prompt using template from prompts/answer_prompt.tpl
    try:
        # Resolve prompts directory relative to backend package
        base_dir = Path(__file__).resolve().parents[1]
        prompts_dir = str(base_dir / "prompts")
        if not os.path.exists(prompts_dir):
            # fallback to repository-level prompts
            prompts_dir = os.path.join(os.getcwd(), "backend", "prompts")
        pm = PromptManager(templates_path=prompts_dir)
        template = pm.load_template("answer_prompt")
        # format with variables expected in template
        user_prompt_text = template.replace("{user_question}", body.message).replace("{result_data}", result_data)

        messages = [
            {"role": "system", "content": "You are a concise, factual data interpreter. Respond using only provided RESULT data."},
            {"role": "user", "content": user_prompt_text},
        ]

        resp_text = OpenAIService.chat(messages=messages, temperature=0, max_tokens=800)
    except Exception as e:
        logger.exception("OpenAI call or prompt building failed: %s", e)
        raise HTTPException(status_code=503, detail="AI service unavailable")

    # try parse JSON
    # Try to parse a JSON object from the model output and validate with schema
    ans = None
    remediation = []
    references = []
    try:
        m = re.search(r"\{[\s\S]*\}", resp_text)
        if m:
            j = json.loads(m.group(0))
            # validate/normalize using pydantic schema
            model = AiAnswerModel.model_validate(j)
            ans = model.answer
            remediation = model.remediation or []
            references = model.references or []
        else:
            ans = resp_text
    except Exception as e:
        logger.debug("LLM response schema validation failed, returning raw text: %s", e)
        ans = resp_text

    return {"answer": ans, "remediation": remediation, "references": references}


async def main(req: func.HttpRequest, context: func.Context) -> func.HttpResponse:
    return await func.AsgiMiddleware(fast_app).handle_async(req, context)
