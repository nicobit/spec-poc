from function_texttosql.agents.conversation_state import ConversationState
from function_texttosql.agents.core.tool import BaseTool



class ContextSelector(BaseTool[ConversationState]):
    """
    Identifies the context for the question: BUSINESS / IT-ENGINEER / OTHER
    """
   
    def run(self, state: ConversationState) -> ConversationState:

        try:
            system_prompt = self.promptManager.create_prompt("system_context_selector").format()
            user_prompt = state["question"]
            response = self.call_llm(system_prompt, user_prompt)
            context = self.extract_result(response, "context")
            state["context"] = context

        except Exception as e:
            self.logger.error(f"Error in RewriteQuestion: {e}")
            state["context"] = "ERROR"
            state["answer"] = ""
            raise e
        
        return state

    
    def get_run_updates(self, state: ConversationState) -> dict:
        return {"context": state["context"]}
