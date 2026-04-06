import azure.functions as func
from azure.functions import AsgiFunctionApp
from function_user_profiles.app.app import fast_app


async def main(req: func.HttpRequest, context: func.Context) -> func.HttpResponse:
    return await func.AsgiMiddleware(fast_app).handle_async(req, context)
