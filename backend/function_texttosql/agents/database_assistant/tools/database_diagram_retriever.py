from function_texttosql.agents.conversation_state import ConversationState
from function_texttosql.agents.core.tool import BaseTool
from app.services.db_service import DBHelper



class DatabaseDiagramRetiever(BaseTool[ConversationState]):
    """
    Use Executor Planner to generate the sql query to answer the question.
    """
   
    def run(self, state: ConversationState) -> ConversationState:
        
        db_schema = state['relevant_schema']
        user_question = state["question"]
        
        
        prompt = self.promptManager.create_prompt("database_diagram_retriever").format(schema = db_schema, question = user_question)

        
        result = self.call_llm(prompt,"" )
        mermaid = self.extract_result(result,"mermaid")
        answer = self.extract_result(result,"answer")

        self.logger.warning(f"Mermaid: {mermaid}")

        state["mermaid"] = mermaid
        state["answer"] = answer
        
        return state
    
    def get_run_updates(self, state: ConversationState) -> dict:
        return {"sql_query": state["sql_query"]}    