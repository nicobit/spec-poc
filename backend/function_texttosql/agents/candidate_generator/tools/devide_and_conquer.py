from function_texttosql.agents.conversation_state import ConversationState
from function_texttosql.agents.core.tool import BaseTool
from app.settings import ROWS_LIMIT
from function_texttosql.agents.candidate_generator.tools.utils import Utils



class DevideAndConquer(BaseTool[ConversationState]):
    """
    Use Devide and Conquer to generate the sql query to answer the question.
    """
    history = {}
    def run(self, state: ConversationState) -> ConversationState:

        db_schema = state['relevant_schema']
        examples = state['examples']
        user_question = state["question"]

        #  DEVIDE AND CONQUER STRATEGY
        # ----------------------------------------
        # Step 1: Decompose the question
        sub_questions = self.decompose_question(examples, db_schema, user_question)

        #Step 2: Generate partial SQL queries
        partial_sqls = self.generate_partial_sql(examples, db_schema, user_question, sub_questions)

        # Step 3: Assemble the final SQL query
        final_sql = self.assemble_final_query(examples, db_schema, user_question, sub_questions, partial_sqls)

        self.logger.warning(f"Final SQL query: {final_sql}")
        sql_query = ""
        queries = self.extract_result(final_sql,"sql_query")

        if not queries and final_sql.lower().startswith("select"):
            queries = final_sql

        if not queries or len(queries) == 0 or (queries[0].strip() == ""):
            sql_query = final_sql
            state["command"] = "NO-QUERY"
        else:
            sql_query = queries
            state["sql_query"] = sql_query
            state["chart_type"] = "bar"  # Placeholder for chart type, can be improved
            state["command"] = "CONTINUE"
        
        return state

    
    def get_run_updates(self, state: ConversationState) -> dict:
        self.history["Final query"] = state["sql_query"]
        return self.history
    
    def decompose_question(self,examples, db_schema, user_question):
        self.history["question decomposed"] = user_question
        examples_str = Utils.get_example_str(examples)
        prompt = self.promptManager.create_prompt("decompose_question").format(db_schema=db_schema, examples=examples_str, user_question=user_question)
        response = self.call_llm(prompt,"" ) 
        sub_questions = response.split('\n')
        self.logger.warning(f"Sub-questions: {sub_questions}")
        return [sq.strip() for sq in sub_questions if sq.strip()]

  
    def generate_partial_sql(self,examples, db_schema, user_question, sub_questions):
        
        partial_sqls = []
        examples_str = Utils.get_example_str(examples)
        for i, sub_question in enumerate(sub_questions):
            self.history[f"{i+1} Question "] = sub_question
            context = " ".join(f"Q{i+1}: {sq} SQL{i+1}: {sql}" for i, (sq, sql) in enumerate(zip(sub_questions[:i], partial_sqls)))

            prompt = self.promptManager.create_prompt("generate_partial_sql").format(db_schema=db_schema, user_question=user_question,index = str(i+1), sub_question= sub_question, context = context, example_str = examples_str)

            response = self.call_llm(prompt,"")
            partial_sql = response.strip()

            self.history[f"Partial SQL {i+1}"] = partial_sql
            partial_sqls.append(partial_sql)
        return partial_sqls

    def assemble_final_query( self,examples, db_schema, user_question, sub_questions, partial_sqls):
        examples_str = Utils.get_example_str(examples)

        sub_queries = ""
        for i, (sub_question, partial_sql) in enumerate(zip(sub_questions, partial_sqls)):
            sub_queries += f"Sub-question {i+1}: {sub_question}\n"
            sub_queries += f"SQL {i+1}: {partial_sql}\n"

        prompt = self.promptManager.create_prompt("assemble_final_query").format(db_schema=db_schema, examples=examples_str, user_question=user_question, sub_queries=sub_queries, rows_limit = ROWS_LIMIT)
        response = self.call_llm(prompt,"")
        final_sql = response.strip()
        return final_sql
