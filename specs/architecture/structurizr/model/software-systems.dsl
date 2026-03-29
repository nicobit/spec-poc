adminPortal = softwareSystem "Admin Portal" "Administrative portal and backend platform for environment lifecycle, schedules, and other admin capabilities." {
    description "The system under consideration for this repository."
}

entraId = softwareSystem "Microsoft Entra ID" "Identity provider and token issuer used for authentication and authorization context."
tableStorage = softwareSystem "Azure Table Storage" "Persistence service used for audit data and some table-backed feature storage."
cosmosDb = softwareSystem "Azure Cosmos DB" "Persistence service used for schedules and optional environment persistence."
queueStorage = softwareSystem "Azure Queue Storage" "Queue-backed handoff for scheduled execution work."
keyVault = softwareSystem "Azure Key Vault" "Secret and configuration source for backend runtime settings."
appInsights = softwareSystem "Azure Application Insights" "Observability destination for backend deployment and runtime monitoring."
managedAzureResources = softwareSystem "Managed Azure resources" "External Azure resources that environment lifecycle actions may start, stop, or notify."

admin -> adminPortal "Uses"
environmentManager -> adminPortal "Uses"
scheduleRecipient -> adminPortal "Interacts with for postponement and schedule visibility"

adminPortal -> entraId "Authenticates users with"
adminPortal -> tableStorage "Stores audit and some feature data in"
adminPortal -> cosmosDb "Stores schedules and optional environment data in"
adminPortal -> queueStorage "Queues scheduled execution work in"
adminPortal -> keyVault "Reads secrets and configuration from"
adminPortal -> appInsights "Emits telemetry to"
adminPortal -> managedAzureResources "Controls or notifies"

