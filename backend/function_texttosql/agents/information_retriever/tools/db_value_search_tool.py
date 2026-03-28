from function_texttosql.agents.conversation_state import ConversationState
from function_texttosql.agents.core.tool import BaseTool
from app.services.db_service import DBHelper

import re



class DBValueSearchTool(BaseTool[ConversationState]):
    def __init__(self):
        super().__init__("DBValueSearcher", "Searches the DB for occurrences of given keywords as values")
       
       
    def run(self, state: ConversationState) -> ConversationState:
        results = []

        keywords = state["keywords"]
        if (not keywords or not isinstance(keywords, list)):
            raise ValueError("Keywords should be a non-empty list")
        
        # Search each keyword in text/varchar columns (this is a simple implementation)
        # We will search for exact or partial matches in string columns by querying each table.
        # Note: In practice, use full-text search or an indexed approach (e.g., LSH as per CHESS).
        for kw in keywords:
            if not kw or kw.isdigit():
                continue  # skip purely numeric or empty
            try:
                # We'll search in all varchar/text columns for simplicity
                text_cols = DBHelper.executeSQLQuery("SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE DATA_TYPE IN ('nvarchar','varchar','text','char')")
                
                for table, col in text_cols:
                    # Warning: constructing SQL directly, ensure to param escape properly (here using format for clarity)
                    query = f"SELECT TOP 1 [{col}] FROM [{table}] WHERE [{col}] LIKE ?" 
                    row = DBHelper.executeAndFetchOne(query, f"%{kw}%")
                
                    if row:
                        found_val = row[0]
                        results.append((kw, table, col, str(found_val)))
            except Exception as e:
                print(f"Error searching for keyword {kw}: {e}")

        return state