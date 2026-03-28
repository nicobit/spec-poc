# app/middleware/correlation.py
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

CORRELATION_HEADER = "x-correlation-id"

class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        cid = request.headers.get(CORRELATION_HEADER) or str(uuid.uuid4())
        request.state.correlation_id = cid
        response = await call_next(request)
        response.headers[CORRELATION_HEADER] = cid
        return response
