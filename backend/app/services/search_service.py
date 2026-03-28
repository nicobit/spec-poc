from app.services.azure_search_service import AzureSearchService
from app.services.db_service import DBHelper
from app.services.llm.openai_service import OpenAIService
from app.utils.nb_logger import NBLogger

logger = NBLogger().Log()

class SearchService:

    @staticmethod
    def add_example(database: str, question: str, sql: str) -> bool:
        """
        Adds an example question and its corresponding SQL query.

        :param database: The database identifier.
        :param question: The example question as a string.
        :param sql: The corresponding SQL query as a string.
        :return: True if the example was added successfully.
        """
        logger.info(f"Adding example to database {database}: {question} -> {sql}")
        databaseName = DBHelper.getDBName(database)
        question_embedding = OpenAIService.get_embedding(question)
        sql_embedding = OpenAIService.get_embedding(sql)

        retval = AzureSearchService.add_example_to_search(
            databaseName, question, sql, question_embedding, sql_embedding
        )
        return retval

    @staticmethod
    def get_examples(database: str):
        """
        Retrieves all examples with their questions and corresponding SQL queries.

        :param database: The database identifier.
        :return: A list of dictionaries containing questions and SQL queries.
        """
        logger.info(f"Retrieving examples from database {database}")
        databaseName = DBHelper.getDBName(database)
        return AzureSearchService.list_examples_in_search(databaseName)

    @staticmethod
    def update_example(database: str, doc_id: str, new_question: str, new_sql: str) -> bool:
        """
        Updates an example with a new question and SQL query.

        :param database: The database identifier.
        :param doc_id: The document identifier.
        :param new_question: The new question as a string.
        :param new_sql: The new SQL query as a string.
        :return: The result of the update operation.
        """
        logger.info(f"Updating example in database {database}: {doc_id} -> {new_question} -> {new_sql}")
        databaseName = DBHelper.getDBName(database)
        new_question_embedding = OpenAIService.get_embedding(new_question)
        new_sql_embedding = OpenAIService.get_embedding(new_sql)
        return AzureSearchService.update_example_in_search(
            databaseName, doc_id, new_question, new_sql, new_question_embedding, new_sql_embedding
        )

    @staticmethod
    def delete_example(database: str, doc_id: str) -> bool:
        """
        Deletes an example based on the provided document identifier.

        :param database: The database identifier.
        :param doc_id: The document identifier of the example to delete.
        """
        logger.info(f"Deleting example from database {database}: {doc_id}")
        databaseName = DBHelper.getDBName(database)
        return AzureSearchService.delete_example_from_search(databaseName, doc_id)
    
    @staticmethod
    def find_relevant_examples(database: str, question_embedding: str, top_k: int = 5):
        """
        Finds the most relevant examples for a given query.

        :param database: The database identifier.
        :param question: The question to find relevant examples for.
        :param top_k: The number of top relevant examples to retrieve.
        :return: A list of dictionaries containing the most relevant examples.
        """
        logger.info(f"Finding relevant examples for question: in database {database}")
        # database can be useful in case we want to check with similarities in azure search
        databaseName = DBHelper.getDBName(database)
       
        return AzureSearchService.find_relevant_examples(
            databaseName, question_embedding, top_k
        )
