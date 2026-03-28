Given the database schema:
{db_schema}

Examples:
{examples_str}

User question: {user_question}

Sub questions and SQL Query:
{subquestions_and_sqlquery}

Combine the above SQL queries into a final SQL query.
Include a TOP statement to retrieve just {rows_limit} rows; the TOP clause must immediately follow SELECT.
Prefer using COUNT, DISTINCT, and GROUP BY when needed.
Do not include any additional explanation or commentary.

Provide the final SQL query inside <sql_query> tags.
