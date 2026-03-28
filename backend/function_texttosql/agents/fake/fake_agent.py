from function_texttosql.agents.conversation_state import ConversationState
from function_texttosql.agents.core.agent import AgentBase


class FakeAgent(AgentBase[ConversationState]):
    def __init__(self):
        name = "Fake Agent"  # Fixed name
        description = "Fake agent for testing purposes"  # Fixed description
        super().__init__(name, description)

    def run(self, state: ConversationState) -> ConversationState:
        """
        Run the fake agent.
        """
        state["result"] = "continue"
        return state
    
    def get_run_updates(self, state: ConversationState) -> dict:
        
        return {}