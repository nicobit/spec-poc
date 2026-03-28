from function_texttosql.agents.conversation_state import ConversationState
from function_texttosql.agents.core.tool import BaseTool
from app.services.db_service import DBHelper



class ExecutorPlanner(BaseTool[ConversationState]):
    """
    Use Executor Planner to generate the sql query to answer the question.
    """
   
    def run(self, state: ConversationState) -> ConversationState:
        database_name = state['database']
        sql_query = state['sql_query']
        db_schema = state['relevant_schema']
        test = DBHelper.test(database_name, sql_query,db_schema)
        
        r1 = self.call_llm(test,"" )
        self.logger.warning(f"Alternative Query: {r1}")
        return state
    
    def get_run_updates(self, state: ConversationState) -> dict:
        return {"sql_query": state["sql_query"]}    