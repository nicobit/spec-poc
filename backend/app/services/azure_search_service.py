import uuid
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential
from app.settings import SEARCH_SERVICE_ENDPOINT_SECRET_NAME, SEARCH_API_KEY_SECRET_NAME, SEARCH_INDEX_NAME, KEY_VAULT_CORE_URI
from app.utils.nb_logger import NBLogger
from app.services.secret_service import SecretService
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import SearchIndex, SimpleField, SearchableField, VectorSearch, VectorSearchAlgorithmConfiguration

logger = NBLogger().Log()

class AzureSearchServiceError(Exception):
    def __init__(self, message, code):
        super().__init__(message)
        self.code = code


class AzureSearchService:
    searchClients = {}

    @staticmethod
    def create_search_index(databaseName):

        api_key = SecretService.get_secret_value(KEY_VAULT_CORE_URI, SEARCH_API_KEY_SECRET_NAME)
        search_endpoint = SecretService.get_secret_value(KEY_VAULT_CORE_URI, SEARCH_SERVICE_ENDPOINT_SECRET_NAME)
        try:
            index_name = f"{SEARCH_INDEX_NAME}".lower()
            index_client = SearchIndexClient(
                endpoint= search_endpoint,
                credential=AzureKeyCredential(api_key)
            )

            # Check if the index already exists
            existing_indexes = index_client.list_indexes()
            if any(index.name == index_name for index in existing_indexes):
                return

            index_definition = {
                "name": index_name,
                "fields": [
                    {"name": "doc_id", "type": "Edm.String", "key": True},
                    {"name": "database", "type": "Edm.String", "searchable": True},
                    {"name": "question", "type": "Edm.String", "searchable": True},
                    {"name": "sql", "type": "Edm.String", "searchable": True},
                    {
                        "name": "question_vector",
                        "type": "Collection(Edm.Single)",
                        "searchable": True,
                        "dimensions": 1536,
                        "retrievable":True,
                        
                        "vectorSearchProfile": "myHnswProfile"
                    },
                    {
                        "name": "sql_vector",
                        "type": "Collection(Edm.Single)",
                        "searchable": True,
                        "dimensions": 1536,
                        "retrievable":True,
                        "vectorSearchProfile": "myHnswProfile"
                    }
                ],
                "vectorSearch": {
                    "algorithms": [{ "name": "myHnswAlgorithm", "kind": "hnsw" }],
                    "profiles": [
                        {
                        "name": "myHnswProfile",
                        "algorithm": "myHnswAlgorithm",
                        },
                    ],
                }
            }

            index = SearchIndex.from_dict(index_definition)
            index_client.create_index(index)
            logger.info(f"Search index '{index_name}' created successfully.")
        except Exception as e:
            logger.error(f"Error creating search index in Azure Cognitive Search: {e}")
            raise AzureSearchServiceError("Error creating search index", code=1006)




    @staticmethod   
    def getClient(databaseName):
        """
        Retrieve the SearchClient for the specified database.
        If it doesn't exist, create it and store it in the class variable.
        """
        index_name = f"{SEARCH_INDEX_NAME}".lower()
        api_key = SecretService.get_secret_value(KEY_VAULT_CORE_URI, SEARCH_API_KEY_SECRET_NAME)
        search_endpoint = SecretService.get_secret_value(KEY_VAULT_CORE_URI, SEARCH_SERVICE_ENDPOINT_SECRET_NAME)
        if index_name not in AzureSearchService.searchClients:
            AzureSearchService.searchClients[index_name] = SearchClient(
                endpoint=search_endpoint,
                index_name=index_name,
                credential=AzureKeyCredential(api_key)
            )
        AzureSearchService.create_search_index(databaseName)  # Ensure the index is created before returning the client
        return AzureSearchService.searchClients[index_name]
   

    @staticmethod
    def find_relevant_examples(databaseName, question_embedding: list, top_k: int = 3) -> list:
        try:
            search_client = AzureSearchService.getClient(databaseName)

            # Manually construct the vector query as a dict:
            vector_query = {
                "kind": "vector",  # Must be "vector" for pure vector queries.
                "vector": question_embedding,  # Your embedding array
                "fields": "question_vector",
                "k": top_k,
                "filter": f"database eq '{databaseName}'"  # Include database in the query filter
            }

            results = search_client.search(
                search_text=None,
                vector_queries=[vector_query],
                select=["doc_id","database","question", "sql", "sql_vector", "question_vector"]
            )

            
            examples = []
            for result in results:
                # TODO: to be fixed
                #f not result["database"] or result["database"] != databaseName:
                #   raise AzureSearchServiceError("Database field is null or empty in the search result", code=1007)
                examples.append({
                    "doc_id": result["doc_id"],
                    "question": result["question"],
                    "sql": result["sql"],
                    "question_embedding": result["question_vector"],
                    "sql_embedding": result["sql_vector"]
                })
            return examples
        except Exception as e:
            logger.error(f"Error retrieving examples from Azure Cognitive Search: {e}")
            raise AzureSearchServiceError("Error retrieving examples", code=1001)



    @staticmethod
    def add_example_to_search(databaseName, question: str, sql: str, question_embedding: list, sql_embedding: list):
        try:

            if not databaseName:
                    raise AzureSearchServiceError("databaseName can't be empty", code=1007)
            search_client = AzureSearchService.getClient(databaseName)

            document = {
                "doc_id": str(uuid.uuid4()),
                "question": question,
                "sql": sql,
                "question_vector": question_embedding,
                "sql_vector": sql_embedding,
                "database": databaseName  # Include the database name in the document
            }
            search_client.upload_documents(documents=[document])
        except Exception as e:
            logger.error(f"Error adding example to Azure Cognitive Search: {e}")
            raise AzureSearchServiceError("Error adding example", code=1002)

    @staticmethod
    def delete_example_from_search(databaseName, doc_id: str):
        try:
            search_client = AzureSearchService.getClient(databaseName)
            search_client.delete_documents(documents=[{"doc_id": doc_id}])
        except Exception as e:
            logger.error(f"Error deleting example from Azure Cognitive Search: {e}")
            raise AzureSearchServiceError("Error deleting example", code=1003)

    @staticmethod
    def update_example_in_search(databaseName, doc_id: str, new_question: str, new_sql: str, new_question_embedding: list, new_sql_embedding: list):

        if not databaseName:
            raise AzureSearchServiceError("databaseName can't be empty", code=1007)

        try:
            search_client = AzureSearchService.getClient(databaseName)

            updated_document = {
                "doc_id": doc_id,
                "question": new_question,
                "sql": new_sql,
                "question_vector": new_question_embedding,
                "sql_vector": new_sql_embedding,
                "database": databaseName  # Include the database name in the document

            }
            search_client.merge_documents(documents=[updated_document])
        except Exception as e:
            logger.error(f"Error updating example in Azure Cognitive Search: {e}")
            raise AzureSearchServiceError("Error updating example", code=1004)

    @staticmethod
    def list_examples_in_search(databaseName) -> list:
        if not databaseName:
            raise AzureSearchServiceError("databaseName can't be empty", code=1007)

        try:
            search_client = AzureSearchService.getClient(databaseName)
            filter_query = f"database eq '{databaseName}'"
            results = search_client.search(search_text="*",filter=filter_query, select=["question", "sql","doc_id","database"], top=100)
            examples = []
            for result in results:
                examples.append({
                    "doc_id": result["doc_id"],
                    "question": result["question"],
                    "sql": result["sql"],
                    "database": result["database"]
                })
            return examples
        except Exception as e:
            logger.error(f"Error listing examples from Azure Cognitive Search: {e}")
            raise AzureSearchServiceError("Error listing examples", code=1005)
