import azure.functions as func
from azure.functions import AsgiFunctionApp
from function_health.app.app import fast_app 

# You can restrict management endpoints by setting authLevel to 'function' and health to 'anonymous' (split functions).
# For simplicity, this sample uses one route and 'anonymous' - secure at the platform level in production.
# asgi = AsgiFunctionApp(app=app, http_auth_level=func.AuthLevel.ANONYMOUS)


async def main(req: func.HttpRequest, context: func.Context) -> func.HttpResponse:
    return await func.AsgiMiddleware(fast_app).handle_async(req, context)
