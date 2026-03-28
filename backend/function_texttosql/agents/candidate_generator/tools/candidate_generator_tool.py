from function_texttosql.agents.conversation_state import ConversationState
from function_texttosql.agents.core.tool import BaseTool
from app.settings import ROWS_LIMIT
from function_texttosql.agents.candidate_generator.tools.utils import Utils
from app.services.db_service import DBHelper


_REFINE_SYSTEM_PROMPT = (
"You are a SQL Refiner Agent. You are given the following context:\n"
"1. Database schema:\n{schema}\n\n"
"2. User question:\n{question}\n\n"
"3. A candidate SQL query:\n{sql_candidate}\n\n"
"4. An error message from executing the candidate (if any):\n{error_message}\n\n"
"Refine the SQL query to correct any syntactical or logical errors so it adheres to the schema. "
"Return only the refined SQL query in <FINAL_QUERY> tags."
)


class CandidateGeneratorTool(BaseTool[ConversationState]):

    """
    Easy way to generate SQL query to answer the question.
    """

    # TODO: the values before need to be per user , otherwise will be shared between them and produce wrong/mixed results
    sql_query = ""
    chart_type = ""
    reasoning = ""
    with_refined = False

    def run(self, state: ConversationState) -> ConversationState:

        database = state["database"] 
        user_question = state["question"]
        relevant_schema = state["relevant_schema"] 
        examples = state["examples"]
        self.candidates_tried = 0
        self.sql_query = ""
        self.reasoning = ""
        self.with_refined = False

        if(relevant_schema == None or relevant_schema == ""):
            state["command"] = "NO-SCHEMA"
            state["answer"] = str("Not data available to anwer the question.")
        else:
            state["command"] = "CONTINUE"

            example_str = Utils.get_example_str(examples)

            self.reasoning = ""
            candidate_steps = ["1_generate_candidate", "2_generate_candidate", "3_generate_candidate"]

            for step in candidate_steps:
                self.candidates_tried += 1
                system_prompt = self.promptManager.create_prompt(step).format(rows_limit =  ROWS_LIMIT ,examples=example_str, database_schema=relevant_schema, user_question = user_question)
                self.logger.warning(f"System Prompt {step}: {system_prompt}")
                result = self.call_llm( system_prompt, user_question)
                self.logger.warning(f"Result {step}: {result}")
                self.sql_query = self.extract_result(result,"FINAL_ANSWER")
                current_reasoning = self.extract_result(result,"REASONING")
                #self.reasoning += "----------\n\n" + current_reasoning + "\n\n"
                #self.reasoning += "- SQL Query:\n" + self.sql_query+ "\n\n\n\n"
                #state["reasoning"] = self.reasoning
                if(self.sql_query and self.sql_query.strip() != ""):
                    try:
                        results = DBHelper().executeSQLQuery(database= database, sql_query=self.sql_query)
                    except Exception as e:
                        self.logger.error(f"Error executing SQL: {str(e)}")
                        self.sql_query = self.refine_candidate(state, self.sql_query, str(e))
                        self.with_refined = True
                        try:
                            results = DBHelper().executeSQLQuery(database= database, sql_query=self.sql_query)
                        except Exception as e:
                            state["output"] = "error"
                            state["error"] = f"Error executing SQL: {str(e)}"
                            self.logger.error(f"Error executing SQL: {str(e)}")
                            results = None
                    
                    if results is not None :
                        self.logger.warning(f"Results: {results}")
                        state["query_result"] = results
                        state["sql_query"] = self.sql_query
                        state["chart_type"] = "bar"
                        self.reasoning = current_reasoning
                        state["reasoning"] = current_reasoning
                        break
        return state
    


    def refine_candidate(self,state: ConversationState, candidate: str, error_message: str = "") -> str:
        """Refine one candidate SQL query using error clues and context."""
        schema = state["relevant_schema"] 

        question = state["question"]
        

        prompt = _REFINE_SYSTEM_PROMPT.format(
            schema=schema,
            question=question,
            sql_candidate=candidate,
            error_message=error_message or "No error."
        )
       

        response = self.call_llm("You are a SQL Refiner Agent.", prompt)
        sql_query = self.extract_result(response,"FINAL_QUERY")
        
        self.logger.warning(f"Refined SQL query: {sql_query}")
        return sql_query
    
    def get_run_updates(self, state: ConversationState) -> dict:
        withRefined = "Yes" if self.with_refined else "No"
        return {"Number of candidates tempted": self.candidates_tried , "With refine": withRefined }    