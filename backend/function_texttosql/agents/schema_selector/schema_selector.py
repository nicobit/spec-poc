from function_texttosql.agents.conversation_state import ConversationState
from function_texttosql.agents.core.agent import AgentBase
from function_texttosql.agents.schema_selector.tools.few_shot_schema_selector import FewShotSchemaSelector


class SchemaSelectorAgent(AgentBase[ConversationState]):
    def __init__(self):
        name = "Schema Selector Agent"  # Fixed name
        description = "Filter Schema to be used in the prompt for text to sql"  # Fixed description
        super().__init__(name, description)
        self.register_tool("Few Shot Example Schema Selector", FewShotSchemaSelector())
        

    def get_run_updates(self, state: ConversationState) -> dict:
        
        return {}