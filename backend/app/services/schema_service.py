import math

from app.services.db_service import DBHelper
from app.utils.nb_logger import NBLogger
import app.services.embedding_service as embedding_service
import json
from typing import Dict

logger = NBLogger().Log()


SCHEMA = {}

def initialize_schema_embeddings(database:str) -> dict:
    """
    Compute and cache embeddings for each table in the schema.
    """
    logger.warning(f"Initializing schema embeddings for database : {database}...")
    
    global SCHEMA
    if SCHEMA == {}:
        retval = {}

        user_mschema = True

        retval = embedding_service.load_from_blob(database) 

        if retval is None:
            retval = {}
            if user_mschema == False:
                #------- VERSION 1 ------------------
                schema =  DBHelper.getDBSchema(database)
                
                for table_name, columns in schema.items():
                    # Create a summary string for the table.
                    # Since there's no description, we only list table name and columns.
                    summary = f"Table: {table_name}. Columns: {', '.join(columns)}."
                    embedding = embedding_service.get_or_generate_embedding(database,table_name,summary)
                    retval[table_name] = {
                    "embedding": embedding,
                        "columns": columns  # store the columns list
                    }
                logger.warning(f"Schema embeddings loaded from blob storage for database: {database}. STARTING TO SAVE...")
                embedding_service.save_to_blob(database, retval)
                logger.warning(f"Schema embeddings loaded from blob storage for database: {database}. SAVED...")
              
                    
            if user_mschema == True:
                # ------------ VERSION 2 ---------------------

                mschema = DBHelper.get_mschema_tables( database)

                for table_name, table_info in mschema.items():
                    # Create a summary string for the table.
                    # Since there's no description, we only list table name and columns.
                        
                    summary = "\n".join(table_info) #f"table: {table_name}. Table Info : {', '.join(columns)}."
                    embedding = embedding_service.get_or_generate_embedding(database,"m_" + table_name,summary)
                    retval[table_name] = {
                        "embedding": embedding,
                        "columns": table_info  # store the columns list
                    }
                logger.warning(f"Schema embeddings loaded from blob storage for database: {database}. STARTING TO SAVE...")
                embedding_service.save_to_blob(database, retval)
                logger.warning(f"Schema embeddings loaded from blob storage for database: {database}. SAVED...")
        else:
            # If the blob data is found, we can use it directly.
            # This assumes that the blob data is already in the correct format.
            logger.warning(f"Schema embeddings loaded from blob storage for database: {database}.")


        SCHEMA = retval
    return SCHEMA
    
  
def cosine_similarity(vec1: list, vec2: list) -> float:
    """Compute cosine similarity between two vectors."""
    if len(vec1) != len(vec2):
        raise ValueError("Vectors must have the same length")

    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    norm1 = math.sqrt(sum(a * a for a in vec1))
    norm2 = math.sqrt(sum(b * b for b in vec2))

    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(dot_product / (norm1 * norm2))

def is_similarity_significant(vec1: list, vec2: list, threshold: float = 0.9) -> bool:
    """
    Check if the cosine similarity between two vectors is above a given threshold.
    
    Args:
        vec1 (list): First vector.
        vec2 (list): Second vector.
        threshold (float): The similarity threshold to consider as significant.
        
    Returns:
        bool: True if similarity is above the threshold, False otherwise.
    """
    similarity = cosine_similarity(vec1, vec2)
    logger.warning(f"Cosine Similarity: {similarity}")
    return similarity >= threshold


def get_relevant_schema(database:str,question_embedding: list, table_embedding:dict,top_k: int = 5) -> Dict[str, str]:
    """
    Given the embedding for the user question, select the top_k most relevant tables
    from the schema and return a string description.
    """
    # database can be useful in case we want to check with similarities in azure search
    similarities = []
    for table_name, data in table_embedding.items():
        sim = cosine_similarity(question_embedding, data["embedding"])
        if sim > 0.7:
            similarities.append((sim, table_name))
    # Sort by similarity (descending) and take top_k.
    similarities.sort(key=lambda x: x[0], reverse=True)
    selected_tables = [t for _, t in similarities[:top_k]]  
    
    # Build a schema snippet string from selected tables.
    retval = {}
    for table in selected_tables:
        #line = f"Table: {table['table']} | Columns: {', '.join(table['columns'])} | Description: {table['description']}"
        line = ', '.join(table_embedding[table]['columns'])
        if(table not in retval):
            retval[table] = []
        retval[table].append(line)
        
    #return "\n".join(schema_snippet_lines)
    return retval

