import azure.functions as func 
from fastapi import FastAPI, Request, Response
from pydantic import BaseModel
from function_texttosql.ai_bot import nl_to_sql,  get_graph_png
from shared.utils.nb_logger import NBLogger
from shared.context import get_current_user
from shared.utils.cors_helper import CORSHelper
from shared.utils.connection_string_parser import ConnectionStringParser


logger = NBLogger().Log()
fast_app = FastAPI() 
CORSHelper.set_CORS(fast_app)

@fast_app.get("/api/texttosql/") 
async def return_http_no_body(req: Request): 
    await get_current_user(req)
    
     
    connection_string = "Driver={ODBC Driver 17 for SQL Server};Server=tcp:your_server.database.windows.net,1433;Database=your_database;Uid=your_username;Pwd=your_password;Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;"
    retval = ConnectionStringParser.setConnectionStringWithDatabase(connection_string, "new_database")
    if "new_database" in retval:
        print("Database updated successfully.")
    return Response(content="Text to SQL Is working v.1.3", media_type="text/plain") 

# Pydantic model for request
class QueryRequest(BaseModel):
    query: str
    session_id: str
    database: str = "default"

class QueryResponse(BaseModel):
    chart_type: str
    results: list



@fast_app.post("/api/texttosql/query")
async def query(req: Request, body: QueryRequest):
    user = await get_current_user(req)
    query = body.query
    session_id = body.session_id
    database = body.database

    logger.info(f"query called with the following parameters: query={query}; session_id={session_id}")
    result = await nl_to_sql(query, session_id, user["oid"], database)
    if result["chart_type"] is None:
        result["chart_type"] = "None"

    return {
        "results": result["response"],
        "chart_type": result["chart_type"],
        "answer": result["answer"],
        "sql_query": result["sql_query"],
        "execution_history": result["execution_history"],
        "mermaid": result["mermaid"],
        "reasoning": result["reasoning"]
    }

@fast_app.get("/api/texttosql/graph.png")
async def get_graph_image(req: Request):
    await get_current_user(req)
    # Generate the image as PNG bytes using Mermaid rendering
    #return graph_mermaid
    png_bytes = get_graph_png()
    return Response(content=png_bytes, media_type="image/png")


async def main(req: func.HttpRequest, context: func.Context) -> func.HttpResponse:
    return await func.AsgiMiddleware(fast_app).handle_async(req, context)

