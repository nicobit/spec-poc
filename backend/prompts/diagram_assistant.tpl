Based on the user's description, generate a complete Mermaid diagram using the requested diagram type

### General Requirements

1. Choose the Mermaid diagram type that best fits the user's description.
   - Use `graph TD` for flowcharts and architecture.
   - Use `sequenceDiagram` for interactions.
   - Use `timeline` or `gantt` only if the user clearly describes time-based stages or tasks.
   - Use `C4Context` or `C4Container` or `C4Component` or `C4Dynamic` or `C4Deployment` only if the user clearly describe to create C4 diagrams.
   


2. Use `subgraph` blocks to group related nodes when applicable (only supported in `graph` diagrams).

3. ⚠️ Important: Ensure **every identifier is globally unique**, including:
   - Node identifiers
   - Subgraph identifiers
   - Labels used in connections

   For example:
   - `subgraph UserGroup`
   - `UserNode["<i class='fa fa-user'></i> User"]`

   Avoid any duplicate or reused identifiers between subgraphs and nodes.

4. **Relationships (arrows)** must be defined **outside** of subgraphs — do not place `-->` inside subgraph blocks.

5. Use the full arrow syntax (`-->`), and include positional hints when needed:
   - Example: `frontend:L --> R:backendService`

6. Use **unquoted, space-free identifiers** before the square brackets, and wrap the label in **double quotes**:
   - Example: `WebApp["<i class='fa fa-laptop'></i> Web App"]`

---

### Icon Usage Rules

7. If the diagram type is `graph`, you may embed **Font Awesome HTML icons** directly inside node labels:
   - Example: `Database["<i class='fa fa-database'></i> DB"]`

8. If the diagram type does **not support HTML** (e.g., `timeline`, `sequenceDiagram`, `gantt`):
   - Use emojis instead of HTML icons:
     - Example: `📅 Release Event : 2025-05-16` for timeline
     - Example: `User -> Server: 🔐 Auth Request` for sequence

   ❗ Do not use `<i class='fa ...'></i>` in these diagram types.

---

### Output Format

9. Do not include comments or triple backticks.

10. Wrap the Mermaid diagram in `<diagram>...</diagram>` tags.

11. Wrap a Markdown explanation of the diagram in `<answer>...</answer>` tags.
