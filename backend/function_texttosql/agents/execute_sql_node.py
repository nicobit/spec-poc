from function_texttosql.agents.conversation_state import ConversationState
from app.services.db_service import DBHelper
from app.utils.nb_logger import NBLogger

logger = NBLogger().Log()


def execute_sql_node(state: ConversationState) -> ConversationState:
    """
    Execute SQL Query to get the results.
    """
    
    try:
        database = state["database"] 
        sql_query = state["sql_query"]
        logger.info(f"Executing SQL query on database {database}: {sql_query}")
        if sql_query == "":
            state["output"] = "error"
            state["error"] = "SQL query is empty."
            logger.error("SQL query is empty.")
            return state
        results = DBHelper().executeSQLQuery(database= database, sql_query=sql_query)
        
    except Exception as e:
        state["output"] = "error"
        state["error"] = f"Error executing SQL: {str(e)}"
        logger.error(f"Error executing SQL: {str(e)}")
        results = None

    logger.warning(f"Results: {results}")
   
    state["query_result"] = results
    
    return state