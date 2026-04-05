import azure.functions as func
from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
from shared.context import get_current_user
from shared.utils.nb_logger import NBLogger
from shared.client_store import list_clients, get_client
from shared.environment_store import list_environments as _list_environments_seed
from shared.environment_repository import get_environment_store
from shared.scheduler_store import SCHEDULES as _SCHEDULES_SEED
from shared.cosmos_store import get_cosmos_store
from shared.execution_store import (
    list_stage_executions_for_schedule,
    get_failure_summary,
    list_failed_executions,
    get_stage_execution_store,
)
from app.services.llm.openai_service import OpenAIService
from app.services.llm.schemas import AiAnswerModel
from app.services.azure_stage_services import get_stage_services
from .redaction import redact_text
from shared.chat_session_store import (
    new_session,
    append_turn,
    needs_summarization,
    build_history_messages,
    get_session_inmemory,
    put_session_inmemory,
    get_chat_session_store,
)
import json
import re

SESSION_NAME_MAX = 120

logger = NBLogger().Log()
fast_app = FastAPI()

# ---------------------------------------------------------------------------
# Tool definitions exposed to the LLM via function-calling
# ---------------------------------------------------------------------------
_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_recent_executions",
            "description": "Get the most recent stage executions for a specific schedule.",
            "parameters": {
                "type": "object",
                "properties": {
                    "schedule_id": {"type": "string", "description": "The schedule ID"},
                    "limit": {"type": "integer", "description": "Max executions to return (default 10)"},
                },
                "required": ["schedule_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_stage_services",
            "description": "Get Azure services and recent failures for a specific stage.",
            "parameters": {
                "type": "object",
                "properties": {
                    "stage_id": {"type": "string", "description": "The stage ID"},
                    "include_failures": {"type": "boolean", "description": "Include recent failure events"},
                    "lookback_days": {"type": "integer", "description": "How many days of failures to include"},
                    "realtime": {"type": "boolean", "description": "If true, perform live Azure queries (may be slow and require credentials)"},
                },
                "required": ["stage_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_failure_summary",
            "description": "Get aggregated failure counts per schedule over the last N days.",
            "parameters": {
                "type": "object",
                "properties": {
                    "since_days": {"type": "integer", "description": "Number of past days to consider (default 7)"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_failed_executions",
            "description": "List recent failed executions, optionally filtered by schedule.",
            "parameters": {
                "type": "object",
                "properties": {
                    "schedule_id": {"type": "string", "description": "Optional schedule ID filter"},
                    "since_days": {"type": "integer", "description": "Number of past days to consider (default 7)"},
                    "limit": {"type": "integer", "description": "Max results (default 20)"},
                },
                "required": [],
            },
        },
    },
]



class ChatRequest(BaseModel):
    message: str
    filters: dict | None = None
    includeRemediation: bool = True
    session_id: str | None = None
    name: str | None = None  # optional name when creating a new session


# ---------------------------------------------------------------------------
# Tier 1 — compact catalog always injected into every prompt
# ---------------------------------------------------------------------------

def _sanitize_client(client: dict | None) -> dict | None:
    if not client:
        return None
    sanitized = dict(client)
    admins = sanitized.get("clientAdmins") or []
    sanitized["clientAdmins"] = [
        {**a, "id": "<redacted>"} if a.get("id") and "@" in str(a.get("id")) else a
        for a in admins
    ]
    return sanitized


def _build_catalog() -> str:
    clients = [
        {"id": c.get("id"), "name": c.get("name"), "shortCode": c.get("shortCode"), "retired": c.get("retired")}
        for c in list_clients(include_retired=True)
    ]
    _env_store = get_environment_store()
    _raw_envs = _env_store.list_environments() if _env_store else _list_environments_seed()
    environments = [
        {"id": e.get("id"), "name": e.get("name"), "status": e.get("status"), "client": e.get("client"), "clientId": e.get("clientId")}
        for e in _raw_envs
    ]
    _cosmos = get_cosmos_store()
    _raw_schedules = _cosmos.list_schedules(limit=500) if _cosmos else list(_SCHEDULES_SEED)
    schedules = [
        {
            "id": s.get("id"),
            "clientId": s.get("client_id") or s.get("clientId"),
            "environment": s.get("environment"),
            "environmentId": s.get("environment_id") or s.get("environmentId"),
            "stage": s.get("stage"),
            "stageId": s.get("stage_id") or s.get("stageId"),
            "action": s.get("action"),
            "enabled": s.get("enabled"),
            "next_run": s.get("next_run"),
        }
        for s in _raw_schedules
    ]
    return json.dumps({"clients": clients, "environments": environments, "schedules": schedules}, indent=2)


# ---------------------------------------------------------------------------
# Tier 2 — tool dispatcher called when LLM emits a tool_call
# ---------------------------------------------------------------------------

def _execute_tool(name: str, args: dict) -> str:
    store = get_stage_execution_store()
    try:
        if name == "get_recent_executions":
            schedule_id = args.get("schedule_id", "")
            limit = int(args.get("limit", 10))
            if store:
                result = store.list_stage_executions_for_schedule(schedule_id, limit=limit)
            else:
                result = list_stage_executions_for_schedule(schedule_id, limit=limit)
            short = [
                {"executionId": e.get("executionId") or e.get("id"), "requestedAt": e.get("requestedAt"), "status": e.get("status"), "error": e.get("error")}
                for e in result
            ]
            return json.dumps(short)

        if name == "get_failure_summary":
            since_days = int(args.get("since_days", 7))
            if store:
                result = store.get_failure_summary(since_days=since_days)
            else:
                result = get_failure_summary(since_days=since_days)
            return json.dumps(result)

        if name == "list_failed_executions":
            since_days = int(args.get("since_days", 7))
            schedule_id = args.get("schedule_id") or None
            limit = int(args.get("limit", 20))
            if store:
                result = store.list_failed_executions(since_days=since_days, schedule_id=schedule_id, limit=limit)
            else:
                result = list_failed_executions(since_days=since_days, schedule_id=schedule_id, limit=limit)
            short = [
                {"executionId": e.get("executionId") or e.get("id"), "scheduleId": e.get("scheduleId"), "requestedAt": e.get("requestedAt"), "status": e.get("status"), "error": e.get("error")}
                for e in result
            ]
            return json.dumps(short)

        if name == "get_stage_services":
            # args: { stage_id: str, include_failures?: bool, lookback_days?: int }
            stage_id = args.get("stage_id")
            if not stage_id:
                return json.dumps({"error": "stage_id is required"})
            include_failures = bool(args.get("include_failures", True))
            lookback_days = int(args.get("lookback_days", 7))
            realtime = bool(args.get("realtime", False))
            try:
                result = get_stage_services(stage_id, include_failures=include_failures, lookback_days=lookback_days, realtime=realtime)
                return json.dumps(result)
            except Exception as exc:
                logger.exception("get_stage_services failed: %s", exc)
                return json.dumps({"error": str(exc)})

    except Exception as exc:
        logger.exception("Tool %s failed: %s", name, exc)
        return json.dumps({"error": str(exc)})

    return json.dumps({"error": f"Unknown tool: {name}"})



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

    # Resolve stable user identifier from JWT claims
    user_id: str = (
        (user or {}).get("oid")
        or (user or {}).get("sub")
        or (user or {}).get("preferred_username")
        or "anonymous"
    )

    # Load or create session
    session_store = get_chat_session_store()
    session = None
    if body.session_id:
        if session_store:
            session = session_store.get_session(body.session_id, user_id)
        else:
            session = get_session_inmemory(body.session_id, user_id)
    if session is None:
        name = (body.name or "")[:SESSION_NAME_MAX] or None
        session = new_session(user_id, name=name)

    # Tier 1: build compact catalog and redact PII
    catalog = redact_text(_build_catalog())

    system_msg = (
        "You are a concise, factual assistant for an admin portal. "
        "Use only the provided CATALOG data and tool results to answer. "
        "Do not invent data. Respond with JSON: {\"answer\": str, \"remediation\": [str], \"references\": [str]}. "
        "The value of the \"answer\" field MUST be a Markdown-formatted string — use headings, lists, and fenced code blocks (```)... when appropriate. "
        "Do not return HTML. Keep the JSON valid and return ONLY the JSON object in your final message. "
        "When listing environments or showing environment details, prefer the environment name (human-facing label) and avoid exposing internal id values — do not include an \"Environment ID\" column in user-facing listings." 
    )
    user_msg = (
        f"CATALOG:\n{catalog}\n\n"
        f"QUESTION: {body.message}"
    )

    # Inject token-budget-windowed history between system prompt and current user turn
    history_messages = [
        {"role": m["role"], "content": redact_text(m["content"])}
        for m in build_history_messages(session)
        if m.get("content")
    ]
    messages = [
        {"role": "system", "content": system_msg},
        *history_messages,
        {"role": "user", "content": user_msg},
    ]

    # Tool-calling loop: max 2 rounds to bound cost
    resp_text = None
    try:
        for _ in range(2):
            msg = OpenAIService.chat_with_tools(messages=messages, tools=_TOOLS, max_tokens=800)

            # No tool call — we have the final answer
            if not msg.tool_calls:
                resp_text = msg.content or ""
                break

            # Append assistant turn with tool calls
            messages.append({"role": "assistant", "content": msg.content, "tool_calls": [
                {"id": tc.id, "type": "function", "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                for tc in msg.tool_calls
            ]})

            # Execute each tool and append results
            for tc in msg.tool_calls:
                args = {}
                try:
                    args = json.loads(tc.function.arguments or "{}")
                except Exception:
                    pass
                tool_result = redact_text(_execute_tool(tc.function.name, args))
                messages.append({"role": "tool", "tool_call_id": tc.id, "content": tool_result})

        if resp_text is None:
            # Ran out of rounds — do a final call without tools
            msg = OpenAIService.chat_with_tools(messages=messages, tools=[], max_tokens=800)
            resp_text = msg.content or ""

    except Exception as e:
        logger.exception("OpenAI call failed: %s", e)
        raise HTTPException(status_code=503, detail="AI service unavailable")

    # Append user turn to session
    append_turn(session, "user", body.message)

    # Parse and validate JSON response to extract the Markdown answer
    ans = None
    remediation: list = []
    references: list = []
    try:
        m = re.search(r"\{[\s\S]*\}", resp_text)
        if m:
            j = json.loads(m.group(0))
            model = AiAnswerModel.model_validate(j)
            ans = model.answer
            remediation = model.remediation or []
            references = model.references or []
        else:
            ans = resp_text
    except Exception as e:
        logger.debug("LLM response schema validation failed, storing raw text: %s", e)
        ans = resp_text

    # Append assistant turn using the parsed answer (prefer Markdown answer when available)
    append_turn(session, "assistant", ans or "")

    # Rolling summarization — triggered when unsummarized turns reach threshold
    if needs_summarization(session):
        unsummarized_turns = session["turns"][session["summarizedUpTo"]:]
        summary_prompt = (
            "Summarize the following conversation turns concisely for system context. "
            "Focus on key facts, questions asked, and answers given.\n\n"
            + "\n".join(f'{t["role"].upper()}: {t["content"]}' for t in unsummarized_turns)
        )
        try:
            sm = OpenAIService.chat_with_tools(
                messages=[{"role": "user", "content": summary_prompt}],
                tools=[],
                max_tokens=400,
            )
            new_summary = sm.content or ""
            if session.get("summary"):
                new_summary = session["summary"] + "\n" + new_summary
            session["summary"] = new_summary
            session["summarizedUpTo"] = len(session["turns"])
        except Exception as e:
            logger.warning("Summarization failed (non-blocking): %s", e)

    # Persist session
    if session_store:
        try:
            session_store.put_session(session)
        except Exception as e:
            logger.warning("Session save failed (non-blocking): %s", e)
    else:
        put_session_inmemory(session)

    return {
        "answer": ans,
        "remediation": remediation,
        "references": references,
        "session_id": session["id"],
        "history": [{"role": t["role"], "content": t["content"]} for t in session["turns"]],
    }


async def main(req: func.HttpRequest, context: func.Context) -> func.HttpResponse:
    return await func.AsgiMiddleware(fast_app).handle_async(req, context)
