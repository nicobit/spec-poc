from function_texttosql.agents.conversation_state import ConversationState

from function_texttosql.agents.core.agent import AgentBase
from function_texttosql.agents.candidate_generator.tools.divide_and_conquer import DivideAndConquer
from function_texttosql.agents.candidate_generator.tools.executor_planner import ExecutorPlanner
from function_texttosql.agents.candidate_generator.tools.generate_sql_node_simple import GenerateSQLSimple
from function_texttosql.agents.candidate_generator.tools.candidate_generator_tool import CandidateGeneratorTool




class CandidateGeneratorAgent(AgentBase[ConversationState]):
    def __init__(self):
        name = "Candidate Generator Agent"  # Fixed name
        description = "Generate the candidate sql query"  # Fixed description
        super().__init__(name, description)
        
        #self.register_tool("Devide And Conquer", DevideAndConquer())
        #self.register_tool("Executor Planner", ExecutorPlanner())
        #self.register_tool("Generate SQL Node Simple", GenerateSQLSimple())
        self.register_tool("Candidate Generator Tool", CandidateGeneratorTool())


    def get_run_updates(self, state: ConversationState) -> dict:
        
        return {}
        
