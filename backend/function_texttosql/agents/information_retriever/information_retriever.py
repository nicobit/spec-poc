from function_texttosql.agents.conversation_state import ConversationState
from function_texttosql.agents.core.agent import AgentBase
from function_texttosql.agents.information_retriever.tools.questions_sql_example_tool import QuestionAndSQLExamplesTool
from function_texttosql.agents.information_retriever.tools.keywords_extraction_tool import KeywordsExtractionTool



class InformationRetrieverAgent(AgentBase[ConversationState]):
    def __init__(self):
        name = "Information Retriever Agent"  # Fixed name
        description = "Retrieve information for text to sql agent"  # Fixed description
        super().__init__(name, description)
        self.register_tool("Information Retriever", QuestionAndSQLExamplesTool())
        self.register_tool("Keywords Extraction", KeywordsExtractionTool())

    def get_run_updates(self, state: ConversationState) -> dict:
        
        return {}