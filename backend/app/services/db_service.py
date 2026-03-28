import pyodbc

from app.services.secret_service import SecretService
from app.settings import (
    CONNECTION_STRING_RETRIEVER, 
    KEY_VAULT_URI, 
    SQL_CONNECTION_STRING_SECRET_NAME, 
    SQL_CONNECTION_STRING, 
    DATABASE_DNS_SECRET_NAME, 
    USERNAME_SECRET_NAME, 
    PASSWORD_SECRET_NAME, 
    DATABASE_NAME, 
    ODBC_DRIVER
)
from app.utils.nb_logger import NBLogger  
from app.utils.connection_string_parser import ConnectionStringParser
from sqlalchemy import create_engine
from app.services.schema_engine import SchemaEngine
from app.services.m_schema import MSchema
import traceback
import xml.etree.ElementTree as ET

from typing import (
    Any, Callable, Dict, Final, Generator, Iterable, Iterator,
    List, Optional, Sequence, Tuple, Union,
)

logger = NBLogger().Log()



class DBHelper:
    # Class variable to cache the connection string across calls.
    _cached_connection_string = ""
    _mschemas = {}

   
    @staticmethod
    def executeSQLQuery(database, sql_query,  *params: Any ):
        """
        Executes a SQL query against Azure SQL Database and returns the results.
        """
        try:
            connection_string = DBHelper.getConnectionString(database)
            conn = pyodbc.connect(connection_string)
            cursor = conn.cursor()
            cursor.execute(sql_query, params)
            columns = [column[0] for column in cursor.description]
            rows = cursor.fetchall()
            conn.close()
            # TODO: check if it is the right approach. Things changed otherwise  TypeError: unhashable type: 'list' when checking token size.
            #results = [dict(zip([str(col) for col in columns], row)) for row in rows]
            results = [
                dict(zip(
                    [tuple(col) if isinstance(col, list) else col for col in columns],
                    row
                ))
                for row in rows
            ]
            #results = [dict(zip(columns, row)) for row in rows]
            return results

        except Exception as e:
            logger.error(f"Error executing SQL query: {e}")
            raise

    @staticmethod
    def executeAndFetchOne(database, sql_query,  *params: Any ):
        """
        Executes a SQL query against Azure SQL Database and returns the results.
        """
        try:
            connection_string = DBHelper.getConnectionString(database)
            conn = pyodbc.connect(connection_string)
            cursor = conn.cursor()
            cursor.execute(sql_query, params)
            retval = cursor.fetchone()
            conn.close()
            return retval

        except Exception as e:
            logger.error(f"Error executing SQL query: {e}")
            raise


    @staticmethod
    def getConnectionString(database: str) -> str:
        """
        Retrieves the connection string, caching it on the class level.
        If a specific database is provided (and it's not "default"), the connection
        string is modified to include that database.
        """
        if DBHelper._cached_connection_string:
            base_connection_string = DBHelper._cached_connection_string
        else:
            if CONNECTION_STRING_RETRIEVER == "keyvault_connection_string":
                try:
                    logger.info("Fetching SQL connection string from Azure Key Vault using Managed Identity.")
                    
                    base_connection_string = SecretService.get_secret_value(KEY_VAULT_URI, SQL_CONNECTION_STRING_SECRET_NAME)
                    DBHelper._cached_connection_string = base_connection_string
                    logger.info("Connection string retrieved successfully from Key Vault.")
                except Exception as e:
                    logger.error(f"Error fetching connection string from Key Vault: {str(e)}")
                    raise
            elif CONNECTION_STRING_RETRIEVER == "connection_string":
                base_connection_string = SQL_CONNECTION_STRING
                if not base_connection_string:
                    logger.error("SQL connection string not found in environment variables.")
                    raise ValueError("SQL connection string is not available.")
                DBHelper._cached_connection_string = base_connection_string
                logger.info("Using connection string from environment variables.")
            elif CONNECTION_STRING_RETRIEVER == "keyvault":
                try:
                    logger.info("Fetching database credentials from Azure Key Vault using Managed Identity.")
                    
                    database_dns = SecretService.get_secret_value(KEY_VAULT_URI,DATABASE_DNS_SECRET_NAME) 
                    username = SecretService.get_secret_value(KEY_VAULT_URI,USERNAME_SECRET_NAME)
                    password = SecretService.get_secret_value(KEY_VAULT_URI,PASSWORD_SECRET_NAME) 

                    base_connection_string = (
                        f"Driver={ODBC_DRIVER};Server={database_dns};Database={DATABASE_NAME};"
                        f"UID={username};PWD={password};Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;"
                    )
                    DBHelper._cached_connection_string = base_connection_string
                    logger.info("Connection string constructed successfully.")
                except Exception as e:
                    logger.error(f"Error fetching credentials from Key Vault: {str(e)}")
                    raise

        if (not database or database == "default") or database == "":
            return base_connection_string
        else:
            return ConnectionStringParser.setConnectionStringWithDatabase(base_connection_string, database)

    @staticmethod
    def getDBName(databaseInput):
        connectionString = DBHelper.getConnectionString(databaseInput)
        retval = ConnectionStringParser.parse(connectionString)["database"]
        return retval


    @staticmethod
    def get_mschema(database: str) -> MSchema:
        """
        Returns the M-Schema for the specified database.
        """
        try:
            if  database not in DBHelper._mschemas:
                connection_string = DBHelper.getConnectionString(database)                                                
                params = ConnectionStringParser.quote(connection_string)
                logger.info(f"Database: {database}")
                db_engine = create_engine(f"mssql+pyodbc:///?odbc_connect={params}")
                
                logger.info(f"Engine created")
                schema_engine = SchemaEngine(engine=db_engine, db_name=database)
                 
                DBHelper._mschemas[database] = schema_engine.mschema
            
            mschema = DBHelper._mschemas[database]
            return mschema
        except Exception as e:
            #logger.error(f"Schema inference failed: {str(e.)}")
            error_details = traceback.format_exc()
            logger.error("An error occurred:\n%s", error_details)
            return {}

    @staticmethod
    def get_mschema_tables(database: str) -> dict:
        """
        Returns the M-Schema for the specified database.
        """
        schema = {}
        try:
            
            mschema = DBHelper.get_mschema(database)
            tables = mschema.tables

            #logger.error (mschema.to_mschema())

            for table_name, table_info in tables.items():
                mschemaTable = mschema.single_table_mschema(table_name)
                
                if table_name not in schema:
                    schema[table_name] = []

                schema[table_name].append(mschemaTable)
               
            return schema
        except Exception as e:
            #logger.error(f"Schema inference failed: {str(e.)}")
            error_details = traceback.format_exc()
            logger.error("An error occurred:\n%s", error_details)
            return {}


    @staticmethod
    def getDBSchema(database: str) -> dict:
        schema = {}
        try:
            connection_string = DBHelper.getConnectionString(database)
            conn = pyodbc.connect(connection_string)
            cursor = conn.cursor()

            # Get table and column names
            cursor.execute("SELECT ( TABLE_SCHEMA + '.' + TABLE_NAME ) as TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS")
            
            for table, column in cursor.fetchall():
                if table not in schema:
                    schema[table] = []
                schema[table].append(column)

            conn.close()
            logger.info("Schema cached successfully.")
            return schema

        except Exception as e:
            logger.error(f"Schema inference failed: {str(e)}")
            return {}

    @staticmethod
    def getDatabases() -> list:
        """
        Returns a list of user databases available in the SQL server, excluding system databases.
        """
        try:
            connection_string = DBHelper.getConnectionString("master")  # Connect to the master database
            conn = pyodbc.connect(connection_string)
            cursor = conn.cursor()

            cursor.execute("""
                SELECT name 
                FROM sys.databases 
                WHERE state = 0 AND name NOT IN ('master', 'tempdb', 'model', 'msdb')
            """)
            databases = [row[0] for row in cursor.fetchall()]
            conn.close()
            logger.info("User database list retrieved successfully.")
            return databases
        except Exception as e:
            logger.error(f"Failed to retrieve database list: {str(e)}")
            raise
    

# -----------------------------------------------------------------------------
    @staticmethod
    def test(database, sql_query, schema):
         # Get the XML execution plan from MSSQL

        conn_str = DBHelper.getConnectionString(database)
        conn = pyodbc.connect(conn_str)
        xml_plan = DBHelper.get_execution_plan_xml(database, sql_query)

        if xml_plan is None:

            logger.error("Failed to retrieve execution plan.")

            return



        # Parse the XML into human-readable steps

        execution_steps = DBHelper.parse_showplan_xml(xml_plan)

        if not execution_steps:

            logger.error("No execution steps found in the plan.")

            return



        # Generate the final prompt combining schema, query, and execution plan steps

        final_prompt = DBHelper.a_generate_prompt(schema, sql_query, execution_steps)

        return final_prompt
    
    @staticmethod
    def get_execution_plan_xml(database,sql_query):
        """
        Connects to SQL Server, sets SHOWPLAN_XML ON, executes the SQL query
        (without running it) and returns the execution plan as XML.
        """
        conn_str = DBHelper.getConnectionString(database)
        connection = pyodbc.connect(conn_str)
        cursor = connection.cursor()

        # Enable SHOWPLAN_XML (this tells SQL Server to return the plan without executing the query)
        cursor.execute("SET SHOWPLAN_XML ON")
        # Move to next result set if needed
        cursor.nextset()

        # Execute the query – note: it will not run the query, just return the plan
        cursor.execute(sql_query)
        row = cursor.fetchone()
        if row:
            logger.info(f"Execution plan XML: {row[0]}")
            plan_xml = row[0]
        else:
            logger.info("Execution plan XML: None")
            plan_xml = None

        # Turn off SHOWPLAN_XML
        cursor.execute("SET SHOWPLAN_XML OFF")
        cursor.nextset()
        connection.close()

        return plan_xml


    def parse_showplan_xml(xml_content: str) -> list:
        """
        Parse a SQL Server XML execution plan and create a human-readable summary.
        """
        
        # Parse the XML content.
        root = ET.fromstring(xml_content)
        ns = {"sql": "http://schemas.microsoft.com/sqlserver/2004/07/showplan"}
        
        summary_lines = []
        
        # Extract high-level details from the <ShowPlanXML> root element.
        version = root.attrib.get("Version", "Unknown")
        build = root.attrib.get("Build", "Unknown")
        summary_lines.append(f"Execution Plan Version: {version} (Build {build})")
        
        # Look for MissingIndexes suggestions
        missing_indexes = root.findall(".//sql:MissingIndex", ns)
        if missing_indexes:
            summary_lines.append("\nMissing Index Recommendations:")
            for mi in missing_indexes:
                table = mi.find("./sql:MissingIndexGroup/sql:MissingIndex", ns)
                if table is not None:
                    table_attrib = table.attrib
                    db = table_attrib.get("Database", "Unknown")
                    schema = table_attrib.get("Schema", "Unknown")
                    table_name = table_attrib.get("Table", "Unknown")
                    summary_lines.append(
                        f"- Consider creating an index on {db}.{schema}.{table_name}."
                    )
        else:
            summary_lines.append("\nNo missing index recommendations found.")
        
        # Find all operator nodes and summarize key info
        relops = root.findall(".//sql:RelOp", ns)
        if relops:
            summary_lines.append("\nOperators and Costs:")
            for op in relops:
                physical_op = op.attrib.get("PhysicalOp", "Unknown")
                logical_op = op.attrib.get("LogicalOp", "Unknown")
                est_rows = op.attrib.get("EstimateRows", "Unknown")
                cost = op.attrib.get("EstimatedTotalSubtreeCost", "Unknown")
                summary_lines.append(
                    f"Operator: {physical_op} (Logical: {logical_op}), Estimated Rows: {est_rows}, Cost: {cost}"
                )
        else:
            summary_lines.append("\nNo operator details found.")
        
        # Optionally, extract additional details such as predicate information:
        predicates = root.findall(".//sql:Predicate", ns)
        if predicates:
            summary_lines.append("\nPredicates:")
            for idx, pred in enumerate(predicates, start=1):
                scalar = pred.find(".//sql:ScalarOperator", ns)
                if scalar is not None and scalar.attrib.get("ScalarString"):
                    summary_lines.append(f"Predicate {idx}: {scalar.attrib.get('ScalarString')}")
        
        # Combine all summary lines into a single string.
        #summary = "\n".join(summary_lines)
        return summary_lines
    


    @staticmethod
    def a_generate_prompt(schema, sql_query, execution_steps):

        """

        Combines the schema, the SQL query, and the execution plan steps into a final prompt.

        The prompt is intended to be human-readable and can be sent to an LLM.

        """

        prompt = "Below is the SQL table schema:\n"

        prompt += schema + "\n\n"

        prompt += "For the following query:\n"

        prompt += sql_query + "\n\n"

        prompt += "The execution plan was as follows:\n"

        for i, step in enumerate(execution_steps, start=1):

            prompt += f"Step {i}: {step}\n"

        prompt += "\nPlease provide an optimized sql query ( if exists ) based on the information above."

        return prompt
    
    @staticmethod
    def a_generate_prompt_1(schema, sql_query, execution_steps):

        """

        Combines the schema, the SQL query, and the execution plan steps into a final prompt.

        The prompt is intended to be human-readable and can be sent to an LLM.

        """

        prompt = "Below is the SQL table schema:\n"

        prompt += schema + "\n\n"

        prompt += "For the following query:\n"

        prompt += sql_query + "\n\n"

        prompt += "The execution plan was as follows:\n"

        for i, step in enumerate(execution_steps, start=1):

            prompt += f"Step {i}: {step}\n"

        prompt += "\nPlease provide a human-readable explanation of the above execution plan."

        return prompt
