from __future__ import annotations

from functools import lru_cache
from importlib import import_module
from typing import Callable, Iterable

from fastapi import FastAPI

from shared.utils.cors_helper import CORSHelper
from shared.utils.nb_logger import NBLogger


logger = NBLogger(__name__).Log()


SubAppFactory = Callable[[], FastAPI]


def _health_app() -> FastAPI:
    from function_health.app.app import fast_app

    return fast_app


def _costs_app() -> FastAPI:
    from function_costs.appl.fastapi_app import app

    return app


def _llm_proxy_app() -> FastAPI:
    from function_llm_proxy import get_app

    return get_app()


def _dashboard_app() -> FastAPI:
    module = import_module("function_dashboard.__init__")
    return module.fast_app


def _diagrams_app() -> FastAPI:
    module = import_module("function_diagrams.__init__")
    return module.fast_app


def _queryexamples_app() -> FastAPI:
    module = import_module("function_queryexamples.__init__")
    return module.fast_app


def _texttosql_app() -> FastAPI:
    module = import_module("function_texttosql.__init__")
    return module.fast_app


def _ai_chat_app() -> FastAPI:
    module = import_module("function_ai_chat.__init__")
    return module.fast_app


DEFAULT_SUBAPPS: tuple[tuple[str, SubAppFactory], ...] = (
    ("health", _health_app),
    ("costs", _costs_app),
    ("llm-proxy", _llm_proxy_app),
    ("ai-chat", _ai_chat_app),
    ("dashboard", _dashboard_app),
    ("diagrams", _diagrams_app),
    ("queryexamples", _queryexamples_app),
    ("texttosql", _texttosql_app),
)


def create_app(subapps: Iterable[tuple[str, SubAppFactory]] | None = None) -> FastAPI:
    app = FastAPI(
        title="Admin Portal Backend",
        version="0.1.0",
        description="ASGI runtime for hosting the backend outside Azure Functions.",
    )
    CORSHelper.set_CORS(app)

    load_status: dict[str, dict[str, str]] = {}

    for name, factory in subapps or DEFAULT_SUBAPPS:
        try:
            subapp = factory()
            app.include_router(subapp.router)
            load_status[name] = {"status": "loaded"}
        except Exception as exc:  # pragma: no cover - exercised via injected tests
            logger.exception("Failed to load ASGI subapp '%s': %s", name, exc)
            load_status[name] = {"status": "failed", "reason": str(exc)}

    @app.get("/")
    async def root():
        return {
            "name": "admin-portal-backend",
            "runtime": "asgi",
            "status": "ok",
        }

    @app.get("/runtime/healthz")
    async def runtime_healthz():
        overall = "ok" if all(item["status"] == "loaded" for item in load_status.values()) else "degraded"
        return {
            "status": overall,
            "subapps": load_status,
        }

    return app


@lru_cache(maxsize=1)
def get_app() -> FastAPI:
    return create_app()


app = get_app()

