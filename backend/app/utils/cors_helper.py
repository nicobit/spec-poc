from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from app.settings import CORS_ALLOWED_ORIGINS

class CORSHelper:

    @staticmethod
    def set_CORS(fast_app: FastAPI):
        allowed_origins = CORS_ALLOWED_ORIGINS.split(',')
        # Enable CORS (Allow only frontend domain)
        fast_app.add_middleware(
            CORSMiddleware,
            allow_origins=allowed_origins,  
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
