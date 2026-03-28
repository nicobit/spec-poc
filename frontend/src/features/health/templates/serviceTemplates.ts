export const SERVICE_TEMPLATES: Record<string, any> = {
  sql_db: {
    name: "sql",
    type: "sql_db",
    enabled: true,
    config: {
      conn_str: { source: "settings", setting_name: "SQL_ODBC_CONNECTION_STRING" },
    },
  },
  key_vault: {
    name: "kv",
    type: "key_vault",
    enabled: true,
    config: {
      vault_uri: { source: "settings", setting_name: "KEY_VAULT_URI" },
      test_secret_name: { source: "inline", value: "health-probe-secret" },
    },
  },
  storage_blob: {
    name: "blob",
    type: "storage_blob",
    enabled: true,
    config: {
      endpoint: { source: "settings", setting_name: "BLOB_ENDPOINT" },
      container: { source: "inline", value: "sample-container" },
    },
  },
  storage_table: {
    name: "table",
    type: "storage_table",
    enabled: true,
    config: {
      endpoint: { source: "settings", setting_name: "TABLES_ENDPOINT" },
      table_name: { source: "inline", value: "healthTable" },
    },
  },
  azure_openai: {
    name: "aoai",
    type: "azure_openai",
    enabled: true,
    config: {
      endpoint: { source: "settings", setting_name: "AZURE_OPENAI_ENDPOINT" },
      api_version: { source: "inline", value: "2024-10-21" },
      live_call: { source: "inline", value: false },
      deployment: { source: "settings", setting_name: "AZURE_OPENAI_DEPLOYMENT" },
    },
  },
  ai_search: {
    name: "search",
    type: "ai_search",
    enabled: true,
    config: {
      endpoint: { source: "settings", setting_name: "AI_SEARCH_ENDPOINT" },
      index_name: { source: "settings", setting_name: "AI_SEARCH_INDEX" },
    },
  },
  service_bus_queue: {
    name: "sbq",
    type: "service_bus",
    enabled: true,
    config: {
      namespace: { source: "settings", setting_name: "SERVICEBUS_NAMESPACE" },
      entity: { type: "queue", queue_name: { source: "inline", value: "orders" } },
    },
  },
  service_bus_subscription: {
    name: "sbs",
    type: "service_bus",
    enabled: true,
    config: {
      namespace: { source: "settings", setting_name: "SERVICEBUS_NAMESPACE" },
      entity: {
        type: "subscription",
        topic_name: { source: "inline", value: "events" },
        subscription_name: { source: "inline", value: "health-probe" },
      },
    },
  },
};
