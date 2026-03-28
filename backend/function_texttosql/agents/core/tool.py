from abc import ABC, abstractmethod
import re
import time
from typing import Generic

from app.services.llm.openai_service import OpenAIService
from app.services.llm.prompt_manager import PromptManager
from function_texttosql.agents.core.system_state import T
from app.utils.nb_logger import NBLogger




class BaseTool(ABC, Generic[T]):
    def __init__(self, name = "", description = ""):
        # Set a consistent tool name by converting the class name to snake_case.
        self.logger = NBLogger().Log()
        if( not name):
            name = self._camel_to_snake(self.__class__.__name__)
        self.tool_name = name 
        self.description  = description
        self.promptManager = PromptManager()

    def __call__(self, state: T) -> T:
        return self.run_tool(state)

    def run_tool(self, state: T) -> T:
        
        #self.logger.info(f"---START: {self.tool_name}---")
        start_time = time.time()
        #state.executing_tool = self.tool_name
        
        try:
            # Execute the tool's main functionality.
            status = {"executed_at": time.strftime("%Y.%m.%d: %H.%M.%S")}
            state = self.run(state)
            status["status"] = "success"
        except Exception as err:
            error_msg = f"{type(err).__name__}: {err}"
            self.logger.error(f"Tool '{self.tool_name}' encountered an error:\n{error_msg}")
            state["errors"][self.tool_name] = error_msg
            status = {"status": "error", "error": error_msg}
        
        status["execution_time"] = round(time.time() - start_time, 1)
        self.log_update(state, status)
        self.logger.info(f"---END: {self.tool_name} in {status['execution_time']} seconds---")
        return state

    def call_llm(self, system_prompt: str, user_prompt: str, temperature=0.7, max_tokens=512) -> str:
        answer = OpenAIService.chat(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=temperature,
            max_tokens=max_tokens
        )
        return answer
    
    # Common
    def extract_result(self,answer : str, tag : str) -> str:

        try:
            if tag not in answer:
                return ""
            matches = re.findall(f"<{tag}>(.*?)</{tag}>", answer, re.DOTALL)
            retval = matches[0].strip() if matches else ""
            retval = retval.replace("```sql", "").replace("```", "")
            return retval.strip()
            #return answer.split(f"<{tag}>")[1].split(f"</{tag}>")[0].strip()
        except Exception as e:
            self.logger.error(f"Error extracting result with tag '{tag}': {e}")
            return ""

     # Common
    def get_embedding(self, text:str) -> list:
        # Get the embedding for a given text using OpenAI's embedding service.
        embedding = OpenAIService.get_embedding(text)
        return embedding

    def log_update(self, state: T, status: dict):
        # Prepare a log entry containing tool name and execution status.
        run_log = {"tool_name": self.tool_name}
        if status["status"] == "success":
            run_log.update(self.get_run_updates(state))
        run_log.update(status)

        if "execution_history" not in state:
            state["execution_history"] = []

        state["execution_history"].append(run_log)
        ex_history = state["execution_history"]
        #self.logger.info(f"Execution History : {ex_history}")

    @abstractmethod
    def run(self, state: T) -> T:
        """
        The core functionality of the tool. Subclasses must implement this method.
        It should process the given SystemState and update it accordingly.        """
        pass
    
    @abstractmethod
    def get_run_updates(self, state: T) -> T:
        pass

    def _camel_to_snake(self, name: str) -> str:
        # Convert CamelCase to snake_case.
        s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
        s2 = re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1)
        return s2.lower()
