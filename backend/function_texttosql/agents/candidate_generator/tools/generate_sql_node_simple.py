from function_texttosql.agents.conversation_state import ConversationState
from function_texttosql.agents.core.tool import BaseTool
from app.services.db_service import DBHelper
from function_texttosql.agents.candidate_generator.tools.utils import Utils
from app.settings import ROWS_LIMIT



class GenerateSQLSimple(BaseTool[ConversationState]):
    """
    Easy way to generate SQL query to answer the question.
    """
    sql_query = ""
    chart_type = ""

    def run(self, state: ConversationState) -> ConversationState:

        user_question = state["question"]
        relevant_schema = state["relevant_schema"] 
        examples = state["examples"]

        if(relevant_schema == None or relevant_schema == ""):
            state["command"] = "NO-SCHEMA"
            state["answer"] = str("Not data available to anwer the question.")
        else:
            state["command"] = "CONTINUE"

            example_str = Utils.get_example_str(examples)
            system_prompt = self.promptManager.create_prompt("generate_sql_simple").format(rows_limit =  ROWS_LIMIT ,examples=example_str, database_schema=relevant_schema)

            result = self.call_llm( system_prompt, user_question)
            
            self.sql_query = self.extract_result(result,"sql_query")
            self.chart_type = self.extract_result(result,"chart_type")

        return state

    
    def get_run_updates(self, state: ConversationState) -> dict:
        return {"Geneated Query": self.sql_query, "chart_type": self.chart_type}        