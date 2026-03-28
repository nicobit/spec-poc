from function_texttosql.agents.conversation_state import ConversationState
from function_texttosql.agents.core.tool import BaseTool
from app.services.search_service import SearchService


class QuestionAndSQLExamplesTool(BaseTool[ConversationState]):

    def run(self, state: ConversationState) -> ConversationState:
        """
        Run the tool to get SQL examples.
        """
        database = state["database"]
        question_embedding = state["question_embedding"]
        retval = SearchService.find_relevant_examples(database,question_embedding)
        state["examples"] = retval
        return state

    def get_run_updates(self, state: ConversationState) -> dict:
        # Placeholder implementation
        return {}