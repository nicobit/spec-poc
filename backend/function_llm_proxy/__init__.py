from functools import lru_cache

import azure.functions as func


@lru_cache(maxsize=1)
def get_app():
    from function_llm_proxy.appl.fastapi_app import create_fastapi_app

    return create_fastapi_app()


async def main(req: func.HttpRequest, context: func.Context) -> func.HttpResponse:
    return await func.AsgiMiddleware(get_app()).handle_async(req, context)
