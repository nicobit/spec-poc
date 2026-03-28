from function_texttosql.agents.conversation_state import ConversationState
from function_texttosql.agents.core.tool import BaseTool


class RewriteQuestion(BaseTool[ConversationState]):
    """
    Rewrites the question to be more specific and understandable for the system.
    It can also ask for clarification if the question is too vague or unsupported.
    """
    chat_response = ""

    def run(self, state: ConversationState) -> ConversationState:

        try:

            user_question = state["question"]
            prompt_message = self.promptManager.create_prompt("chat_agent").format()
            self.chat_response = self.call_llm(  prompt_message, user_question)
            final_question = self.extract_result(self.chat_response,"question")
            clarification = ""
           
            if not final_question:
                clarification = self.extract_result(self.chat_response,"clarify")

            if( final_question ):
                state["question"] = final_question
                state["answer"] = str("Question not supported.")
                state["proceed"] = True
                # TODO: can be moved on the tool that check for schema
                state["question_embedding"] = self.get_embedding(final_question)
            
            elif (clarification):
                # The system is asking more info to clarify the question
                state["answer"] = str(clarification)
                state["proceed"] = False
                state["command"] = str("CLARIFY")
            
            else:
                # The system is asking more info to clarify the question
                state["answer"] = str(self.chat_response)
                state["proceed"] = False
                state["command"] = str("CLARIFY")


        except Exception as e:
            self.logger.error(f"Error in RewriteQuestion: {e}")
            state["command"] = "ERROR"
            state["answer"] = str(e)
            raise e
        
        return state

    
    def get_run_updates(self, state: ConversationState) -> dict:
        return {"Chat answer": self.chat_response, "question": state["question"]}
