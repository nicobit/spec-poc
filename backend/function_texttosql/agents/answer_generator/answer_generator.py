from function_texttosql.agents.conversation_state import ConversationState
import tiktoken
import json
from function_texttosql.agents.core.agent import AgentBase


class AnswerGeneratorAgent(AgentBase[ConversationState]):
    def __init__(self):
        name = "Answer Generator Agent"  # Fixed name
        description = "Answer to the user based on the result"  # Fixed description
        super().__init__(name, description)
        
    def run_before(self, state):
       
        user_question = state["question"]
        query_result = state["query_result"] 

        token_count = self.count_tokens(query_result)

        self.logger.info(f"Token count for query result: {token_count}")
        if token_count > 1100:
            answer = str("The result is too large to display. Please refine your question.")
        else:
            
            result_str = str(query_result)
            #followup_prompt = (
            #    f"User question: \"{user_question}\"\n"
            #    f"SQL query results: {result_str}\n"
            #    "Provide and Articulate an answer based on these results and trying to give some insight and help to analyze it, without saying that was based on a query. Ask at the end another possible related things to be asked by the user. Format the answer in markdown."
            #)
            #system_prompt = "Provide and Articulate an answer based on these results and trying to give some insight and help to analyze it, without saying that was based on a query. Ask at the end another possible related things to be asked by the user. Format the answer in markdown."
            #system_prompt += f"\nSQL query results: {result_str}\n"
            
            
            system_prompt = self.promptManager.create_prompt("answer_prompt").format( user_question = user_question ,result_data=result_str)

            answer = self.call_llm(system_prompt, "")
            
            
            state["answer"] = answer
        
        return state

    def count_tokens(data, model_name='gpt-3.5-turbo'):
        
        try:
            # text = json.dumps(data, default=str)
            text = str(data)
            encoding = tiktoken.encoding_for_model(model_name)
            return len(encoding.encode(text))
        except Exception as e:
            
            return 0
    

    def get_run_updates(self, state: ConversationState) -> dict:
        
        return {}