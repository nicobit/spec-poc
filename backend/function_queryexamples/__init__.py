import azure.functions as func 
from fastapi import FastAPI, Request, Response
from pydantic import BaseModel
from shared.utils.nb_logger import NBLogger
from shared.context import get_current_user
from shared.utils.cors_helper import CORSHelper
from shared.services.db_service import DBHelper
from shared.services.search_service import SearchService
from shared.utils.connection_string_parser import ConnectionStringParser


logger = NBLogger().Log()
fast_app = FastAPI() 
CORSHelper.set_CORS(fast_app)


@fast_app.get("/api/queryexamples/databases")
async def get_databases(req: Request):
    user = await get_current_user(req)
    try:
        databases = DBHelper.getDatabases()
        return {"databases": databases}
    except Exception as e:
        logger.error(f"Error retrieving databases: {str(e)}")
        return Response(content="Failed to retrieve databases", status_code=500)

class ExampleRequest(BaseModel):
    question: str
    sql: str
    database: str = "default"

@fast_app.post("/api/queryexamples/add_example")
async def add_example(req: Request,body: ExampleRequest):
    user = await get_current_user(req)
    try:
        question = body.question
        sql = body.sql
        database = body.database

        logger.info(f"Adding example with question: {question} and SQL: {sql}")
        # Assuming there's a method to save examples in DBHelper
        SearchService.add_example(database,question,sql)
        return {"message": "Example added successfully"}
    except Exception as e:
        logger.error(f"Error adding example: {str(e)}")
        return Response(content="Failed to add example", status_code=500)

@fast_app.get("/api/queryexamples/examples")
async def list_examples(req: Request,database: str = "default"):
    user = await get_current_user(req)
    try:
        logger.info(f"Listing examples for database: {database}")
        examples = SearchService.get_examples(database)
        return {"examples": examples}
    except Exception as e:
        logger.error(f"Error listing examples: {str(e)}")
        return Response(content="Failed to list examples", status_code=500)


@fast_app.delete("/api/queryexamples/delete_example")
async def delete_example(req: Request,doc_id: str, database: str = "default"):
    user = await get_current_user(req)
    try:
        logger.info(f"Deleting example with question: {doc_id} from database: {database}")
        # Assuming there's a method to delete examples in SearchService
        SearchService.delete_example(database, doc_id)
        return {"message": "Example deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting example: {str(e)}")
        return Response(content="Failed to delete example", status_code=500)

class ExampleRequest(BaseModel):
    doc_id:str
    question: str
    sql: str
    database: str = "default"

@fast_app.put("/api/queryexamples/update_example")
async def update_example(req: Request, body: ExampleRequest):
    user = await get_current_user(req)
    try:
        question = body.question
        sql = body.sql
        database = body.database
        doc_id = body.doc_id

        logger.info(f"Updating example with ID: {doc_id}, question: {question}, and SQL: {sql}")
        # Assuming there's a method to update examples in SearchService
        SearchService.update_example(database, doc_id, question, sql)
        return {"message": "Example updated successfully"}
    except Exception as e:
        logger.error(f"Error updating example: {str(e)}")
        return Response(content="Failed to update example", status_code=500)

async def main(req: func.HttpRequest, context: func.Context) -> func.HttpResponse:
    return await func.AsgiMiddleware(fast_app).handle_async(req, context)

