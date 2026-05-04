## Prompt: Explore a Codebase and Generate Parser-Safe Structurizr DSL for a C4 Model

Use the prompt below with an LLM/coding agent that has access to the project files.

```text
You are an expert software architect and code analyst.

Your task is to explore a source code repository and produce a Structurizr DSL workspace that documents the architecture using the C4 model.

Important:
- The target DSL parser is stricter than generic Structurizr examples found online.
- You must generate DSL that follows the parser-safe nested form described below.
- Do not use shorthand or alternate Structurizr syntaxes unless they match these rules exactly.

Goal:
- Understand the real architecture from the code, configuration, manifests, infrastructure files, and docs.
- Infer the main software system, its containers, important components when possible, users, external systems, data stores, messaging systems, scheduled jobs, and deployment/integration boundaries.
- Generate a valid Structurizr DSL file that can be rendered directly.

Working rules:
- Do not guess when evidence is weak. Mark uncertain items explicitly in a short assumptions section before the DSL.
- Base conclusions on concrete repository evidence such as:
  - source folders and module boundaries
  - package manifests
  - Dockerfiles / docker-compose
  - CI/CD definitions
  - IaC files
  - environment configuration
  - README / docs
  - API specs
  - messaging, database, auth, cache, and queue integrations
- Prefer architecture that is actually implemented over architecture that is merely intended.
- If the repo contains multiple applications, identify the primary system and its supporting/external systems.
- If details are missing, use generic but honest labels such as "Background Worker", "Web App", "API", "Database", "Message Broker", "External Identity Provider".

Hard syntax rules:
- Declare `container` only inside a `softwareSystem { ... }` block.
- Declare `component` only inside a `container { ... }` block.
- Do not declare a `container` at top level with a parent identifier argument.
- Do not declare a `component` at top level with a parent identifier argument.
- Use nesting, not inline parent references.
- Use simple identifiers like `main_system`, `web_app`, `api`, `database`, `worker`.
- Prefer relationships between declared identifiers only after those identifiers exist.
- Keep the DSL conservative: if unsure, omit component views rather than inventing unsupported detail.

Forbidden patterns:
- `container parentId "Name" ...`
- `component parentId "Name" ...`
- any top-level `container` outside a software system block
- any top-level `component` outside a container block

Analysis process:
1. Inspect the repository structure.
2. Identify the main entry points, runtime processes, and deployable units.
3. Identify the primary users and external actors.
4. Identify external dependencies and upstream/downstream systems.
5. Identify containers inside the main software system:
   - frontend apps
   - APIs
   - backend services
   - workers
   - databases
   - caches
   - queues/topics
   - batch jobs
   - serverless functions
   - gateways / reverse proxies
6. Infer key relationships:
   - who uses what
   - sync vs async if visible
   - data flow direction
   - auth flow if visible
7. If enough evidence exists, also identify important components inside the most critical container.
8. Produce one coherent Structurizr DSL workspace.

Output format:
- First provide:
  - `Summary`
  - `Evidence`
  - `Assumptions / Uncertainties`
- Then provide:
  - one complete `structurizr.dsl` code block only
- The DSL must be syntactically valid.
- Do not output pseudocode or partial DSL.

Structurizr DSL requirements:
- Use:
  - `workspace {`
  - `model {`
  - `views {`
- Include at minimum:
  - people
  - the main software system
  - internal containers
  - external software systems
  - relationships
- Add useful descriptions when known.
- Add tags to distinguish types such as:
  - `Person`
  - `Software System`
  - `External`
  - `WebApp`
  - `Api`
  - `Database`
  - `Queue`
  - `Cache`
  - `Worker`
  - `MobileApp`
  - `CLI`
  - `Container`
- Prefer stable, readable identifiers.
- Group closely related containers when there is a clear bounded context or subsystem.
- Include at least these views when possible:
  - system landscape
  - system context for the main system
  - container view for the main system
  - component view only if supported by strong evidence
- Add `autolayout`.

Parser-safe modeling rules:
- Prefer this declaration style:
  - `id = person "Name" "Description" "Person"`
  - `main_system = softwareSystem "Name" "Description" "Software System" { ... }`
  - `web_app = container "Web App" "Description" "React" "WebApp" { ... }`
  - `module_a = component "Module A" "Description" "TypeScript" "Component"`
- If a description or technology is unknown, keep the structure simple rather than improvising unsupported syntax.
- External systems should remain top-level software systems or people, not nested containers inside another system unless the repository clearly models them that way.
- Put relationships where they are easiest to read after the involved elements are declared.

Style constraints:
- Keep the model concise and useful.
- Do not create fake precision.
- Do not model every class or package.
- Focus on deployable/runtime architecture, not source-code inheritance.
- Use technology labels when known, for example:
  - `React`
  - `Node.js`
  - `Java Spring Boot`
  - `PostgreSQL`
  - `Redis`
  - `Azure Service Bus`
  - `RabbitMQ`
  - `Keycloak`
- When a system is clearly external, tag it as external.

Preferred DSL shape:
- Follow a structure like this, adapting names to the actual project:

workspace {

  properties {
    "shape.pack" "c4"
  }

  model {
    user = person "Business User" "Uses the platform" "Person"

    main_system = softwareSystem "Main System" "Short description" "Software System" {
      web_app = container "Web App" "User-facing application" "React" "WebApp"
      api = container "API" "Exposes business capabilities" "Node.js/Express" "Api"
      worker = container "Background Worker" "Processes async jobs" "Python" "Worker"
      database = container "Database" "Stores application data" "PostgreSQL" "Database"
      cache = container "Cache" "Caches transient data" "Redis" "Cache"

      web_app -> api "Calls"
      api -> database "Reads/Writes"
      api -> cache "Reads/Writes"
      api -> worker "Publishes jobs to"
    }

    idp = softwareSystem "Identity Provider" "Handles authentication" "Software System,External"
    payments = softwareSystem "Payment Provider" "External payment service" "Software System,External"

    user -> main_system "Uses"
    main_system -> idp "Authenticates with"
    main_system -> payments "Uses"
  }

  views {
    systemLandscape "landscape" "System landscape" {
      include *
      autolayout lr
    }

    systemContext main_system "context" "System context" {
      include *
      autolayout lr
    }

    container main_system "containers" "Container view" {
      include *
      autolayout lr
    }

    styles {
      element "External" {
        opacity 60
      }
      element "Database" {
        shape cylinder
      }
    }
  }
}

Bad example that must never be produced:
- `web_app = container main_system "Web App" ...`
- `dsl_pipeline = component web_app "DSL Pipeline" ...`

Final instruction:
- Explore first, reason from evidence, and then produce the final DSL.
- If the repo is too ambiguous, produce the best defensible first-pass architecture and clearly label uncertainties.
```

## Recommended Strict Prompt

```text
Analyze this repository and generate a valid Structurizr DSL workspace for a C4 model.

Critical syntax constraint:
- `container` must be nested inside its parent `softwareSystem`.
- `component` must be nested inside its parent `container`.
- Never use `container parentId ...` or `component parentId ...`.

Infer the main software system, users, external systems, containers, key relationships, and optionally components if strongly supported by code evidence. Use repository evidence only, avoid unsupported guesses, summarize evidence and uncertainties first, then output one complete DSL code block with system landscape, system context, and container views plus autolayout.
```

## Practical Tip

If the model still drifts into generic Structurizr syntax, prepend this line before the prompt:

```text
Use only the nested DSL form accepted by my parser. Containers must be declared inside `softwareSystem {}` and components must be declared inside `container {}`. If you violate this, the answer is invalid.
```
