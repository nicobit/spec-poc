import uvicorn
from fastapi import FastAPI
from .settings import settings
from .health_router import router as health_router
from .config_router import router as config_router

fast_app = FastAPI()
fast_app.include_router(health_router)
fast_app.include_router(config_router, tags=["config"])
#fast_app.include_router(config_router, prefix="/config", tags=["config"])

