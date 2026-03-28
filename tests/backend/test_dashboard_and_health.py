import importlib
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


class DashboardServiceTests(unittest.TestCase):
    def test_load_dashboard_data_returns_deserialized_payload(self):
        from function_dashboard.dashboard_service import DashboardService

        table_client = MagicMock()
        table_client.get_entity.return_value = {"dashboard": json.dumps({"tabs": [{"id": "home"}]})}

        table_service_client = MagicMock()
        table_service_client.get_table_client.return_value = table_client

        with patch("function_dashboard.dashboard_service.TableServiceClient.from_connection_string", return_value=table_service_client):
            service = DashboardService("UseDevelopmentStorage=true", "dashboard")

        payload = service.load_dashboard_data("user-1")

        self.assertEqual(payload, {"tabs": [{"id": "home"}]})
        table_client.get_entity.assert_called_once_with(partition_key="Dashboard", row_key="user-1")

    def test_save_dashboard_data_upserts_expected_table_entity(self):
        from function_dashboard.dashboard_service import DashboardService

        captured_entities = []

        table_client = MagicMock()
        table_client.upsert_entity.side_effect = lambda entity: captured_entities.append(dict(entity))

        table_service_client = MagicMock()
        table_service_client.get_table_client.return_value = table_client

        with patch("function_dashboard.dashboard_service.TableServiceClient.from_connection_string", return_value=table_service_client):
            service = DashboardService("UseDevelopmentStorage=true", "dashboard")

        service.save_dashboard_data("user-1", [{"id": "tab-1"}])

        self.assertEqual(
            captured_entities[0],
            {
                "PartitionKey": "Dashboard",
                "RowKey": "user-1",
                "dashboard": json.dumps([{"id": "tab-1"}]),
            },
        )


class HealthConfigLoaderTests(unittest.IsolatedAsyncioTestCase):
    async def test_resolve_field_supports_inline_and_settings_sources(self):
        import function_health.app.config_loader as config_loader

        with patch.dict(os.environ, {"API_KEY_NAME": "from-settings"}, clear=False):
            inline_value = await config_loader.resolve_field({"source": "inline", "value": "literal"})
            settings_value = await config_loader.resolve_field(
                {"source": "settings", "setting_name": "API_KEY_NAME"}
            )

        self.assertEqual(inline_value, "literal")
        self.assertEqual(settings_value, "from-settings")

    async def test_resolve_field_rejects_unknown_source(self):
        import function_health.app.config_loader as config_loader

        with self.assertRaises(config_loader.ConfigResolutionError):
            await config_loader.resolve_field({"source": "mystery"})

    async def test_load_services_config_prefers_repository_when_configured(self):
        import function_health.app.config_loader as config_loader

        repo = SimpleNamespace(
            get_config=AsyncMock(return_value=({"services": [{"name": "kv"}], "default_timeout_seconds": 5}, "etag-1"))
        )

        with patch.object(config_loader, "get_repository", return_value=repo):
            payload = await config_loader.load_services_config()

        self.assertEqual(payload["services"][0]["name"], "kv")
        self.assertEqual(payload["default_timeout_seconds"], 5)

    async def test_load_services_config_falls_back_to_file_when_no_repository(self):
        import function_health.app.config_loader as config_loader
        import function_health.app.repositories.factory as repo_factory

        with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".json", delete=False) as handle:
            json.dump({"services": [{"name": "blob"}], "default_timeout_seconds": 3}, handle)
            file_path = handle.name

        try:
            config_loader = importlib.reload(config_loader)
            repo_factory = importlib.reload(repo_factory)

            original_path = config_loader.settings.SERVICES_CONFIG_PATH
            original_file_path = config_loader.settings.CONFIG_FILE_PATH

            config_loader.settings.SERVICES_CONFIG_PATH = file_path
            config_loader.settings.CONFIG_FILE_PATH = None

            with patch.object(config_loader, "get_repository", return_value=None):
                payload = await config_loader.load_services_config()

            self.assertEqual(payload["services"][0]["name"], "blob")
            self.assertEqual(payload["default_timeout_seconds"], 3)
        finally:
            config_loader.settings.SERVICES_CONFIG_PATH = original_path
            config_loader.settings.CONFIG_FILE_PATH = original_file_path
            os.unlink(file_path)


if __name__ == "__main__":
    unittest.main()
