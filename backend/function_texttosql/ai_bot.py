try:
    from langchain_core.messages import HumanMessage
except ImportError:  # pragma: no cover - compatibility with older langchain layouts
    from langchain.schema import HumanMessage
from typing import Dict
from langgraph.graph import StateGraph, END

from app.utils.nb_logger import NBLogger


from function_texttosql.agents.conversation_state import ConversationState #, initialize_conversation_state

from function_texttosql.agents.fake.fake_agent import FakeAgent
from function_texttosql.agents.execute_sql_node import execute_sql_node 
from function_texttosql.agents.answer_generator.answer_generator import AnswerGeneratorAgent
from function_texttosql.agents.schema_selector.schema_selector import SchemaSelectorAgent
from function_texttosql.agents.candidate_generator.candidate_generator_agent import CandidateGeneratorAgent
from function_texttosql.agents.chat.chat_agent import ChatAgent
from function_texttosql.agents.architecture_assistant.architecture_assistant import ArchitectureAssistantAgent
from function_texttosql.agents.information_retriever.information_retriever import InformationRetrieverAgent
from function_texttosql.agents.database_assistant.database_assistant_agent import DatabaseAssitantAgent

from app.settings import DATABASE_NAME


from app.services.db_service import DBHelper


logger = NBLogger().Log()
# In-memory storage for conversation contexts (could use persistent storage for long-term memory)
user_sessions: Dict[str, "ConversationState"] = {}  

graph = StateGraph(ConversationState)

CHAT_AGENT = "Chat Agent"
INFORMATION_RETREIVER_AGENT = "Information Retriever Agent"
SCHEMA_SELECTOR_AGENT_STR = "Schema Selector Agent"
GENERATE_SQL_NODE_STR = "Generate SQL"
EXECUTE_SQL_NODE_STR = "Execute SQL"
VALIDATE_RESULT_NODE_STR = "Validate Result"
GENERATE_FINAL_ANSWER_NODE_STR = "Generate Final Answer"
CANDIDATE_GENERATOR_AGENT_STR = "Candidate Generator Agent"
ARCHITECTURE_ASSISTANT = "Architecture Assistant"
DATABASE_ASSISTANT_AGENT = "Database Assistant"


graph.add_node(CHAT_AGENT, ChatAgent() )
graph.add_node(CANDIDATE_GENERATOR_AGENT_STR, CandidateGeneratorAgent())
graph.add_node(ARCHITECTURE_ASSISTANT, ArchitectureAssistantAgent())
graph.add_node(SCHEMA_SELECTOR_AGENT_STR, SchemaSelectorAgent())
graph.add_node(INFORMATION_RETREIVER_AGENT, InformationRetrieverAgent() )
#graph.add_node(EXECUTE_SQL_NODE_STR, execute_sql_node)
graph.add_node(VALIDATE_RESULT_NODE_STR, FakeAgent())
graph.add_node(GENERATE_FINAL_ANSWER_NODE_STR, AnswerGeneratorAgent())
graph.add_node(DATABASE_ASSISTANT_AGENT, DatabaseAssitantAgent())


def route_by_state(state: ConversationState) -> str:
    return state["result"]

# Edges
# -------------------------------------------
graph.add_conditional_edges(CHAT_AGENT, lambda state: state["context"],
    {
        "BUSINESS": INFORMATION_RETREIVER_AGENT, 
        "DIAGRAM": ARCHITECTURE_ASSISTANT,
        "IT-ENGINEER": INFORMATION_RETREIVER_AGENT,
        "OTHER":END,
        "CLARIFY":END
    }
)

graph.add_edge(ARCHITECTURE_ASSISTANT, END)

graph.add_edge(INFORMATION_RETREIVER_AGENT, SCHEMA_SELECTOR_AGENT_STR)

graph.add_conditional_edges(SCHEMA_SELECTOR_AGENT_STR, lambda state: (state["context"].strip().upper() + "_" + state["command"].strip().upper()),
    {
        ("BUSINESS_CONTINUE"): CANDIDATE_GENERATOR_AGENT_STR,
        ("IT-ENGINEER_CONTINUE"): DATABASE_ASSISTANT_AGENT,
       
        ("BUSINESS_NO-SCHEMA"): END,
        ("IT-ENGINEER_NO-SCHEMA"): END,
    }
)

graph.add_edge(DATABASE_ASSISTANT_AGENT, END)

graph.add_conditional_edges(CANDIDATE_GENERATOR_AGENT_STR, lambda state: state["command"],
    {
        "NO-QUERY": END, 
        "CONTINUE": GENERATE_FINAL_ANSWER_NODE_STR,
    }
)
#graph.add_edge(EXECUTE_SQL_NODE_STR, VALIDATE_RESULT_NODE_STR)
#graph.add_conditional_edges(VALIDATE_RESULT_NODE_STR, lambda state: state["result"],
#    {
#        "retry": SCHEMA_SELECTOR_AGENT_STR, 
#        "continue": GENERATE_FINAL_ANSWER_NODE_STR
#    }
#)    
#graph.add_conditional_edges(VALIDATE_RESULT_NODE_STR,GENERATE_FINAL_ANSWER_NODE_STR)                
graph.add_edge(GENERATE_FINAL_ANSWER_NODE_STR, END)

# Entry Point
# -------------------------------------------
graph.set_entry_point(CHAT_AGENT)
compiled_graph = graph.compile()





def get_graph_png() -> bytes:
    """
    Generate and return the PNG representation of the graph.
    """
    return compiled_graph.get_graph().draw_mermaid_png()



# Define the state for LangGraph
async def nl_to_sql(user_input: str, session_id: str, user_id: str, database: str = "default") -> Dict[str, str]:
    """
        Orchestrate the entire NL-to-SQL workflow
    """
    user_session = user_id + "-" + session_id

    if user_session not in user_sessions:
        user_sessions[user_session] = ConversationState.initialize()

    # Retrieve the user conversation state
    state = user_sessions[user_session]
    state = ConversationState.cleanOnNewQuestion(state)

    # Append new questions
    index = len(state["history"])
    myContent = f"{index + 1}. {user_input}"
    state["history"].append(HumanMessage(content= myContent ))

    # Current question
    state["question"] = user_input
    
    # Set the database name in the Conversation state
    databaseName = DBHelper.getDBName(database)
    if( not databaseName or databaseName == "default"):
        databaseName = DATABASE_NAME
    state["database"] = databaseName


    state["user_session"] = user_session

    # Execute the flow
    state = compiled_graph.invoke(state)

    # Append the execution history to chat history: execution history is reset on each request , chat history is kept
    state["chat_history"].append(state["execution_history"])

    # Set the the user session wit the new state value
    user_sessions[user_session] = state

    retval = {
        "answer":state["answer"],
        "sql_query": state["sql_query"],
        "response": state["query_result"],
        "chart_type": state["chart_type"],
        "execution_history": state["execution_history"], 
        "mermaid": state["mermaid"],
        "reasoning": state["reasoning"]
        }
    
    
    return retval
