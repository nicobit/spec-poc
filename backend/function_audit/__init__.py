import csv
import io
from typing import Optional

from fastapi import FastAPI, HTTPException, Request, Query
from fastapi.responses import Response

from shared import audit_store
from shared import execution_store
from shared.context import get_current_user
from shared.authz import has_any_role, has_client_admin_for
from function_environment.common import logger
import azure.functions as func

fast_app = FastAPI()


@fast_app.get("/api/audit")
async def list_audit(req: Request):
    q = req.query_params
    actor_q = q.get("actor")
    client_q = q.get("client")
    action_q = q.get("action")
    resource_type_q = q.get("resourceType")
    resource_id_q = q.get("resourceId")
    start_ts = q.get("from")
    end_ts = q.get("to")
    try:
        page = int(q.get("page", "0"))
    except Exception:
        page = 0
    try:
        per_page = int(q.get("per_page", "50"))
    except Exception:
        per_page = 50

    user = await get_current_user(req)
    if not (has_any_role(user, ["admin", "auditor"]) or has_any_role(user, ["environment-manager"])):
        raise HTTPException(status_code=403, detail="Forbidden")

    # enforce scoping: environment-manager may only view their client(s)
    if not has_any_role(user, ["admin", "auditor"]) and has_any_role(user, ["environment-manager"]):
        # if caller provided a client filter, ensure they are client-admin for it
        if client_q:
            if not has_client_admin_for(user, client_q):
                raise HTTPException(status_code=403, detail="Forbidden")
        else:
            # otherwise, scope results to the client's claim if present
            client_claim = user.get("client") or user.get("clientId") or user.get("client_ids")
            if client_claim:
                # if list, pick first
                if isinstance(client_claim, (list, tuple)):
                    client_q = client_claim[0]
                else:
                    client_q = client_claim

    # server-side filters supported by audit_store: client, action, start_ts, end_ts
    items, total = audit_store.read_audit(
        client=client_q, action=action_q, start_ts=start_ts, end_ts=end_ts, page=page, per_page=per_page
    )

    # additional filtering (actor, resourceType, resourceId)
    def matches(item):
        try:
            if actor_q and actor_q.lower() not in str(item.get("actor") or item.get("preferred_username") or "").lower():
                return False
            if resource_type_q and str(item.get("resourceType") or "").lower() != resource_type_q.lower():
                return False
            if resource_id_q and resource_id_q.lower() not in str(item.get("resourceId") or "").lower():
                return False
        except Exception:
            return False
        return True

    filtered = [it for it in items if matches(it)]

    return {"items": filtered, "total": total, "page": page, "per_page": per_page}


@fast_app.get("/api/audit/export")
async def export_audit(req: Request):
    q = req.query_params
    client_q = q.get("client")
    action_q = q.get("action")
    start_ts = q.get("from")
    end_ts = q.get("to")

    user = await get_current_user(req)
    if not has_any_role(user, ["admin", "auditor"]):
        raise HTTPException(status_code=403, detail="Forbidden")

    # fetch up to cap
    per_page = int(q.get("per_page", "10000"))
    per_page = max(1, min(per_page, 10000))
    items, total = audit_store.read_audit(client=client_q, action=action_q, start_ts=start_ts, end_ts=end_ts, page=0, per_page=per_page)

    # log export action
    try:
        actor = user.get("preferred_username") or user.get("username") or "unknown"
        audit_store.append_audit({"action": "export", "actor": actor, "client": client_q or "", "count": len(items)})
    except Exception:
        logger.exception("Failed to append audit for export")

    # build CSV
    output = io.StringIO()
    if items:
        # collect header keys
        header_keys = set()
        for it in items:
            header_keys.update(it.keys())
        header = list(sorted(header_keys))
        writer = csv.DictWriter(output, fieldnames=header)
        writer.writeheader()
        for it in items:
            # mask details for non-admins
            row = dict(it)
            if not has_any_role(user, ["admin"]):
                if "details" in row:
                    row["details"] = "<redacted>"
            writer.writerow(row)
    else:
        output.write("no_records\n")

    csv_bytes = output.getvalue().encode("utf-8")
    filename = f"audit-export.csv"
    headers = {"Content-Disposition": f"attachment; filename={filename}"}
    return Response(content=csv_bytes, media_type="text/csv", headers=headers)


@fast_app.get("/api/audit/{audit_id}")
async def get_audit(audit_id: str, req: Request):
    user = await get_current_user(req)
    if not (has_any_role(user, ["admin", "auditor"]) or has_any_role(user, ["environment-manager"])):
        raise HTTPException(status_code=403, detail="Forbidden")

    # brute-force search through fallback store (MVP)
    page = 0
    per_page = 200
    while True:
        items, total = audit_store.read_audit(page=page, per_page=per_page)
        if not items:
            break
        for it in items:
            # support RowKey/RowKey-like or id field
            if str(it.get("RowKey") or it.get("id") or it.get("auditId") or "") == audit_id:
                return it
        page += 1
        if page * per_page > total:
            break

    raise HTTPException(status_code=404, detail="Audit record not found")


@fast_app.get("/api/executions")
async def list_executions(req: Request):
    q = req.query_params
    stage_id = q.get("stageId")
    schedule_id = q.get("scheduleId")
    status_q = q.get("status")
    try:
        page = int(q.get("page", "0"))
    except Exception:
        page = 0
    try:
        per_page = int(q.get("per_page", "50"))
    except Exception:
        per_page = 50

    user = await get_current_user(req)
    if not (has_any_role(user, ["admin"]) or has_any_role(user, ["environment-manager"]) or has_any_role(user, ["auditor"])):
        raise HTTPException(status_code=403, detail="Forbidden")

    # use in-memory list and filter
    items = []
    try:
        items = execution_store.list_stage_executions() if hasattr(execution_store, "list_stage_executions") else []
    except Exception:
        try:
            from shared.execution_store import list_stage_executions as _list_exec

            items = _list_exec()
        except Exception:
            items = []

    def match(e):
        if stage_id and e.get("stageId") != stage_id:
            return False
        if schedule_id and e.get("scheduleId") != schedule_id:
            return False
        if status_q and str(e.get("status") or "").lower() != status_q.lower():
            return False
        return True

    filtered = [e for e in items if match(e)]
    total = len(filtered)
    start = page * per_page
    return {"items": filtered[start : start + per_page], "total": total, "page": page, "per_page": per_page}


@fast_app.get("/api/executions/{execution_id}")
async def get_execution(execution_id: str, req: Request):
    user = await get_current_user(req)
    if not (has_any_role(user, ["admin"]) or has_any_role(user, ["environment-manager"]) or has_any_role(user, ["auditor"])):
        raise HTTPException(status_code=403, detail="Forbidden")

    # try store proxy first
    rec = None
    try:
        if hasattr(execution_store, "get_stage_execution"):
            rec = execution_store.get_stage_execution(execution_id)
    except Exception:
        rec = None
    if not rec:
        from shared.execution_store import get_stage_execution as _get_exec

        rec = _get_exec(execution_id)

    if not rec:
        raise HTTPException(status_code=404, detail="Execution not found")
    return rec


async def main(req: func.HttpRequest, context: func.Context) -> func.HttpResponse:
    return await func.AsgiMiddleware(fast_app).handle_async(req, context)
