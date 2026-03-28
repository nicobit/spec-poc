import azure.functions as func
from azure.functions import AsgiMiddleware
from .appl.fastapi_app import app

async def main(req: func.HttpRequest, context: func.Context) -> func.HttpResponse:
    return await func.AsgiMiddleware(app).handle_async(req, context)
