from function_texttosql.agents.conversation_state import ConversationState
from function_texttosql.agents.core.agent import AgentBase
from function_texttosql.agents.architecure_assistant.tools.diagram_assistant   import DiagramAssitant



class ArchitectureAssistantAgent(AgentBase[ConversationState]):
    def __init__(self):
        name = "Chat Agent"  # Fixed name
        description = "Orchestrate the question from the user"  # Fixed description
        super().__init__(name, description)
        self.register_tool("Diagram Assistant", DiagramAssitant())
    


    def get_run_updates(self, state: ConversationState) -> dict:
        
        return {}