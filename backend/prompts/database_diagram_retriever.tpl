Here’s a cleaned‐up, ready‐to‐use prompt that you can feed to a Mermaid‐capable generator (like ChatGPT) to produce exactly the diagram and explanation you need:

---
Based on the user’s provided database schema and question (see below), generate a complete Mermaid diagram that represents the schema.

Schema:  
```
{schema}
```

Question:  
```
{question}
```

Requirements for the Mermaid diagram output:
1. Begin the diagram code on the first line with:
```
graph TD;
```
2. For each table in the schema, create a node with:
- A simple, descriptive identifier (no spaces or special characters)  
- A display label showing the table name and its keys, with `<br>` line breaks:
```
TableName["TableName<br>(PK) id<br>(FK) user_id"]
```
3. Draw directed arrows using `-->` from every foreign‐key node to the node representing the referenced primary key. For example:
```
orders --> customers
```
4. Do **not** quote the node identifiers, only the label text is in double quotes.
5. Do **not** include any comment lines (no `//`), and remove any triple‐backtick fences.
6. Wrap the entire Mermaid diagram code in `<mermaid>` tags.
7. After the diagram, provide a written explanation in Markdown that:
- Describes each table and its role.
- Explains each relationship arrow.
Wrap this explanation in `<answer>` tags.


Important: Add \\n at the end of each line of the Mermaid diagram code .


Your output **must** look like this structure:

```
<mermaid>
graph TD;
…nodes and arrows…
</mermaid>
<answer>
### Explanation

- **Table1**: description…
- **Table2**: description…
- **Relationships**: …
</answer>
```

