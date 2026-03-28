import openai
import json
from azure.storage.blob import BlobServiceClient
from app.settings import BLOB_STORAGE_CONNECTION_STRING_SECRET_NAME, KEY_VAULT_CORE_URI
from app.services.secret_service import SecretService
from app.services.llm.openai_service import OpenAIService
from app.utils.nb_logger import NBLogger

logger = NBLogger().Log()

# Set your OpenAI API key
openai.api_key = "YOUR_OPENAI_API_KEY"


# In-memory cache for embeddings
embedding_cache = {}
CONTAINER_NAME = "embeddings"
blob_service_client = None


def get_blob_service_client():
    global blob_service_client
    if blob_service_client is None:
        connection_string = SecretService.get_secret_value(
            KEY_VAULT_CORE_URI,
            BLOB_STORAGE_CONNECTION_STRING_SECRET_NAME,
        )
        if not connection_string:
            raise RuntimeError("No blob storage connection string available for embeddings.")
        blob_service_client = BlobServiceClient.from_connection_string(connection_string)
    return blob_service_client

def get_key(name,database):
    name_lower = name.lower()
    database_lower = database.lower()
    return f"{database_lower}-{name_lower}"

def load_from_blob(database:str):
    """Load data from Azure Blob Storage."""
    blob_name = f"{database}.json"
    blob_client = get_blob_service_client().get_blob_client(container=CONTAINER_NAME, blob=blob_name)
    try:
        blob_data = blob_client.download_blob().readall()
        data = json.loads(blob_data)
        print(f"Data loaded from Azure Blob: {blob_name}")
        return data
    except Exception as e:
        logger.warning(f"Data not found in blob storage:{blob_name}")
        print(f"Data not found in blob storage: {blob_name} {e}")
        return None

def save_to_blob(database:str,data):
    """Save data to Azure Blob Storage."""
    blob_name = f"{database}.json"
    blob_client = get_blob_service_client().get_blob_client(container=CONTAINER_NAME, blob=blob_name)
    blob_client.upload_blob(json.dumps(data), overwrite=True)
    print(f"Data saved to Azure Blob: {blob_name}")
    logger.warning(f"Data saved to Azure Blob: {blob_name}")

def save_embedding_to_blob(database,name, text, embedding):
    """Save embedding as a JSON file to Azure Blob Storage."""
    key = get_key(name,database)
    blob_name = f"{key}.json"
    blob_client = get_blob_service_client().get_blob_client(container=CONTAINER_NAME, blob=blob_name)
    data = {
        "text_representation": text,
        "embedding": embedding
    }
    blob_client.upload_blob(json.dumps(data), overwrite=True)
    print(f"Embedding saved to Azure Blob: {blob_name}")

def get_embedding_from_blob(database:str,name:str):
    """Try to retrieve the embedding from Azure Blob Storage."""

    key = get_key(name,database)
    blob_name = f"{key}.json"
    logger.warning(f"Trying to retrieve embedding from Azure Blob: {blob_name}")
    blob_client = get_blob_service_client().get_blob_client(container=CONTAINER_NAME, blob=blob_name)
    try:
        blob_data = blob_client.download_blob().readall()
        data = json.loads(blob_data)
        logger.warning(f"Embedding retrieved from Azure Blob: {blob_name}")
        return data['embedding']
    except Exception as e:
        logger.warning(f"Embedding not found in blob storage:{blob_name}")
        print(f"Embedding not found in blob storage: {blob_name} {e}")
        return None

def get_or_generate_embedding(database:str,name:str,text:str):
    """Retrieve from cache, then from blob, or generate a new embedding."""

    key = get_key(name,database)
    logger.warning(f"Trying to retrieve embedding from cache: {key} - 1")
    # Check in-memory cache first
    if key in embedding_cache:
        print("Embedding found in memory cache.")
        return embedding_cache[key]
    logger.warning(f"Trying to retrieve embedding from cache: {key} - 2")
    # Check Azure Blob Storage
    embedding = get_embedding_from_blob(database,name)
    if embedding is not None:
        embedding_cache[key] = embedding
        return embedding
    logger.warning(f"Trying to retrieve embedding from cache: {key} - 3")
    # Generate a new embedding using OpenAI
    print("Generating new embedding using OpenAI...")
    embedding = OpenAIService.get_embedding(text)
    embedding_cache[key] = embedding

    logger.warning(f"Trying to retrieve embedding from cache: {key} - 4")
    # Save to Azure Blob Storage for future use
    save_embedding_to_blob(database,name,text, embedding)
    return embedding
