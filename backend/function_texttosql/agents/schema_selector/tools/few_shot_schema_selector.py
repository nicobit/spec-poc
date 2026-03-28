from function_texttosql.agents.conversation_state import ConversationState
from function_texttosql.agents.core.tool import BaseTool
import app.services.schema_service as schemaService 


class FewShotSchemaSelector(BaseTool[ConversationState]):

    def run(self, state: ConversationState) -> ConversationState:
        """
        Run the tool to get SQL examples.
        """
        
        table_embedding = state["table_embedding"]
        database = state["database"]
        if not table_embedding:
            state["table_embedding"] = {}
        if database not in table_embedding:
            result = schemaService.initialize_schema_embeddings(database)
            if(result != {}):
                # it can be empty also for a network connetion not able to retrive the schema of the database
                state["table_embedding"][database] = result

        
        # 1. Retrieve relevant schema based on question and related schema
        relevant_schema = schemaService.get_relevant_schema(database,state["question_embedding"], state["table_embedding"][database])

        # 2. Retrieve relevant schema based on sql examples and related schema
        examples = state["examples"]
        filtered_examples = []
        if examples:
            
            for example in examples:
                # 1. Check if the question has some match in the example questions
                question_embedding = example["question_embedding"]
                example_embedding = state["question_embedding"]
                
                isSimilar = schemaService.is_similarity_significant(example_embedding,question_embedding )
                self.logger.info(f"Similarity: {isSimilar}")
                # 2. If yes, then get the relevant schema for that example question and add the ones that are not already in the relevant schema list
                if isSimilar == True:
                    temp = schemaService.get_relevant_schema(database, example["sql_embedding"], state["table_embedding"][database])
                    if temp and len(temp) > 0:
                        filtered_examples.append(example)
                        for table, lines in temp.items():
                            if table in relevant_schema:
                                # Append lines from temp that are not already in relevant_schema[table]
                                for line in lines:
                                    if line not in relevant_schema[table]:
                                        relevant_schema[table].append(line)
                            else:
                                relevant_schema[table] = lines.copy()
                # 3. If no, then skip that example
                
        # Store filtered examples back in state
        state["examples"] = filtered_examples
        relevant_schema_str = "\n".join([f"{', '.join(lines)}" for table, lines in relevant_schema.items()])

        state["relevant_schema"] = relevant_schema_str


        

        if relevant_schema_str:
            state["command"] = "CONTINUE"
        else:
            state["answer"] = str("Not data available to answer the question.")
            state["command"] = "NO-SCHEMA"


        return state

    def get_run_updates(self, state: ConversationState) -> dict:
        # Placeholder implementation
        return {}