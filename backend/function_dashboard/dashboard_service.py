from azure.data.tables import TableServiceClient, TableEntity
import json


class DashboardService:
    def __init__(self, connection_string, table_name):
        self.table_service_client = TableServiceClient.from_connection_string(connection_string)
        self.table_name = table_name
        self._ensure_table_exists()

    def _ensure_table_exists(self):
        try:
            self.table_service_client.create_table_if_not_exists(self.table_name)
        except Exception as e:
            print(f"Error ensuring table exists: {e}")

    def load_dashboard_data(self, user_id):
        try:
            table_client = self.table_service_client.get_table_client(self.table_name)
            entity = table_client.get_entity(partition_key="Dashboard", row_key=user_id)
            return json.loads(entity["dashboard"])
        except Exception as e:
            print(f"Error loading dashboard data: {e}")
            return None

    def save_dashboard_data(self, user_id, dashboard_data):
        try:
            table_client = self.table_service_client.get_table_client(self.table_name)
            entity = TableEntity()
            entity["PartitionKey"] = "Dashboard"
            entity["RowKey"] = user_id
            entity["dashboard"] = json.dumps(dashboard_data)
            table_client.upsert_entity(entity)
        except Exception as e:
            print(f"Error saving dashboard data: {e}")

    