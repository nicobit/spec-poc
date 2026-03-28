from function_texttosql.agents.conversation_state import ConversationState
from function_texttosql.agents.core.tool import BaseTool
import re



class KeywordsExtractionTool(BaseTool[ConversationState]):
    def __init__(self):
        super().__init__("KeywordExtractor", "Extracts primary keywords from the question")

    def run(self, state: ConversationState) -> ConversationState:

        question = state["question"]
        # Use a few-shot prompt to get keywords (simple approach: ask for nouns/entities)
        prompt = f"Extract the main nouns or proper nouns and key phrases from the question:\n\"{question}\".\nList them comma-separated."
        # We can call the LLM directly here if we have access to call_llm, or use openai API directly.
        # For simplicity, let's use a direct OpenAI call:
        keywords_text = self.call_llm(prompt,"",0.3,50) 
        self.logger.warning(f"Keywords extracted: {keywords_text}")
        # Split by comma or newline to get keywords
        self.keywords = re.split(r',|\n', keywords_text)
        self.keywords = [kw.strip() for kw in self.keywords if kw.strip()]
        state["keywords"] = self.keywords  # Store keywords in state for later use
        return state

    def get_run_updates(self, state: ConversationState) -> dict:
        # Placeholder implementation
        return {"keywords": self.keywords}  # Return the extracted keywords as updates  