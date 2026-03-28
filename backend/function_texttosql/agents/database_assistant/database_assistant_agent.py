from function_texttosql.agents.conversation_state import ConversationState
from function_texttosql.agents.core.agent import AgentBase
from function_texttosql.agents.database_assistant.tools.database_diagram_retriever import DatabaseDiagramRetiever





class DatabaseAssitantAgent(AgentBase[ConversationState]):
    def __init__(self):
        name = "Database assitant agent"  # Fixed name
        description = "Retrieve information of database plus schema"  # Fixed description
        super().__init__(name, description)
        
        self.register_tool("Datbase diagram retriever", DatabaseDiagramRetiever())
        

    def get_run_updates(self, state: ConversationState) -> dict:
        
        return {}
        