import re
from urllib.parse import urlparse, parse_qs, unquote_plus, urlencode, urlunparse, quote_plus
from app.utils.nb_logger import NBLogger

logger = NBLogger().Log()

class ConnectionStringParser:
    @staticmethod
    def parse(connection_string: str) -> dict:
        """
        Parse a SQL connection string (ODBC-style or DSN-style) into a dictionary.
        Supports both key=value pairs and DSN URLs.
        """
        parsed = {}

        # Detect URL-style connection string
        if "://" in connection_string:
            url = urlparse(connection_string)

            # Extract URL-style components
            parsed["scheme"] = url.scheme
            parsed["username"] = unquote_plus(url.username or "")
            parsed["password"] = unquote_plus(url.password or "")
            parsed["host"] = url.hostname or ""
            parsed["port"] = str(url.port) if url.port else ""
            parsed["database"] = url.path.lstrip("/") if url.path else ""

            # Extract query parameters (e.g., ?driver=ODBC+Driver)
            query_params = parse_qs(url.query)
            for key, value in query_params.items():
                parsed[key.lower()] = unquote_plus(value[0]) if value else ""
        else:
            # ODBC-style key=value parsing
            key_value_pattern = re.compile(r'([^=;]+)\s*=\s*([^;]*)')
            for match in key_value_pattern.finditer(connection_string):
                key = match.group(1).strip().lower()
                value = match.group(2).strip()
                parsed[key] = value

            # Normalize known keys
            if "server" in parsed:
                host_parts = parsed["server"].split(",")
                parsed["host"] = host_parts[0]
                if len(host_parts) > 1:
                    parsed["port"] = host_parts[1]
            if "uid" in parsed:
                parsed["username"] = parsed["uid"]
            if "pwd" in parsed:
                parsed["password"] = parsed["pwd"]
                
        return parsed
    
    @staticmethod
    def quote(connection_string: str) -> str:
        """
        URL-encode the connection string for safe transport in URLs.
        """
        quoted = quote_plus(connection_string)
        #logger.info(f"Quoted connection string: {quoted}")
        return quoted
    

    @staticmethod
    def setConnectionStringWithDatabase(connection_string: str, database: str) -> str:
        """
        Returns a new connection string with the database updated (or added).
        Handles both URL/DSN-style and semicolon-separated connection strings.
        """
        retval = ""
        if "://" in connection_string:
            # URL/DSN style.
            parsed = urlparse(connection_string)
            query_params = parse_qs(parsed.query)
            flattened_params = {k: v[0] for k, v in query_params.items()}
            # Rebuild the netloc with username, password, host, and port.
            netloc = ""
            if parsed.username:
                netloc += parsed.username
                if parsed.password:
                    netloc += f":{parsed.password}"
                netloc += "@"
            if parsed.hostname:
                netloc += parsed.hostname
            if parsed.port:
                netloc += f":{parsed.port}"
            # Build the new URL with the updated database.
            new_path = "/" + database
            new_query = urlencode(flattened_params)
            new_url = urlunparse((
                parsed.scheme,
                netloc,
                new_path,
                parsed.params,
                new_query,
                parsed.fragment
            ))
            retval = new_url
        else:
            # Semicolon-separated style.
            # We'll check if a database key exists, and update it.
            cs_lower = connection_string.lower()
            if "database=" in cs_lower:
                # Update the 'database' key.
                new_cs = re.sub(
                    r"(database\s*=\s*)([^;]+)",
                    lambda m: f"{m.group(1)}{database}",
                    connection_string,
                    flags=re.IGNORECASE
                )
                retval = new_cs
            elif "initial catalog=" in cs_lower:
                new_cs = re.sub(
                    r"(initial catalog\s*=\s*)([^;]+)",
                    lambda m: f"{m.group(1)}{database}",
                    connection_string,
                    flags=re.IGNORECASE
                )
                retval = new_cs
            else:
                # If no database key is found, append it.
                if connection_string.strip().endswith(";"):
                    retval = connection_string + f"Database={database};"
                else:
                    retval = connection_string + f";Database={database};"

        if database not in retval:
            logger.info(f"Database not found in connection string, adding it: {database}")
            retval = retval.replace("database=;", f"database={database};")
            retval = retval.replace("Database=;", f"Database={database};")

        return retval
