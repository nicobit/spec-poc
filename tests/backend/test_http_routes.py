import json
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def _clear_backend_modules(*names: str) -> None:
    for name in names:
        sys.modules.pop(name, None)


class HealthHttpRouteTests(unittest.TestCase):
    def test_healthz_is_public(self):
        from function_health.app.app import fast_app

        with TestClient(fast_app) as client:
            response = client.get("/api/health/healthz")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_readyz_requires_authentication(self):
        from function_health.app.app import fast_app

        with TestClient(fast_app) as client:
            response = client.get("/api/health/readyz")

        self.assertEqual(response.status_code, 401)

    def test_readyz_returns_degraded_when_authenticated_and_no_checks(self):
        from app.auth.roles import auth_only
        from function_health.app.app import fast_app

        fast_app.dependency_overrides[auth_only] = lambda: {"oid": "user-1", "roles": ["Reader"]}

        try:
            with patch("function_health.app.health_router._build_tasks_from_json", new=AsyncMock(return_value=([], 1))):
                with TestClient(fast_app) as client:
                    response = client.get("/api/health/readyz")
        finally:
            fast_app.dependency_overrides.clear()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "degraded")


class CostsHttpRouteTests(unittest.TestCase):
    def test_costs_health_requires_authentication(self):
        from function_costs.appl.fastapi_app import app

        with TestClient(app) as client:
            response = client.get("/api/costs/health")

        self.assertEqual(response.status_code, 401)

    def test_costs_health_returns_status_for_authenticated_user(self):
        from app.auth.roles import auth_only
        from function_costs.appl.fastapi_app import app

        app.dependency_overrides[auth_only] = lambda: {"oid": "user-1", "roles": ["Reader"]}

        try:
            with TestClient(app) as client:
                response = client.get("/api/costs/health")
        finally:
            app.dependency_overrides.clear()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["ok"], True)

    def test_cache_clear_allows_admin_user(self):
        from app.auth.roles import admin_only
        from function_costs.appl.fastapi_app import app

        app.dependency_overrides[admin_only] = lambda: {"oid": "admin-1", "roles": ["Admin"]}

        try:
            with patch("function_costs.appl.fastapi_app.cache.clear", new=AsyncMock()) as clear_mock:
                with TestClient(app) as client:
                    response = client.get("/api/costs/admin/cache/clear")
        finally:
            app.dependency_overrides.clear()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"cleared": True})
        clear_mock.assert_awaited_once()


class DiagramsHttpRouteTests(unittest.TestCase):
    def test_diagrams_root_requires_authentication(self):
        from function_diagrams.__init__ import fast_app

        with TestClient(fast_app) as client:
            response = client.get("/api/diagrams/")

        self.assertEqual(response.status_code, 401)

    def test_subscriptions_requires_authentication(self):
        from function_diagrams.__init__ import fast_app

        with TestClient(fast_app) as client:
            response = client.get("/api/diagrams/subscriptions")

        self.assertEqual(response.status_code, 401)

    def test_subscriptions_returns_graph_for_authenticated_user(self):
        from app.auth.roles import auth_only
        from function_diagrams.__init__ import fast_app

        fast_app.dependency_overrides[auth_only] = lambda: {"oid": "user-1", "roles": ["Reader"]}

        try:
            with patch("function_diagrams.__init__.SubscriptionManager") as manager_cls:
                manager = MagicMock()
                manager.get_subscriptions.return_value = {"nodes": [{"id": "sub"}], "edges": []}
                manager_cls.return_value = manager

                with TestClient(fast_app) as client:
                    response = client.get(
                        "/api/diagrams/subscriptions",
                        headers={"Authorization": "Bearer token-value"},
                    )
        finally:
            fast_app.dependency_overrides.clear()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.text), {"nodes": [{"id": "sub"}], "edges": []})


class QueryExamplesHttpRouteTests(unittest.TestCase):
    def _import_queryexamples_module(self):
        _clear_backend_modules(
            "function_queryexamples",
            "function_queryexamples.__init__",
            "app.services.search_service",
            "app.services.llm.openai_service",
        )

        with patch(
            "app.services.secret_service.SecretService.get_secret_value",
            return_value="test-secret",
        ), patch("openai.AzureOpenAI", MagicMock()):
            import function_queryexamples.__init__ as queryexamples_module

        return queryexamples_module

    def test_databases_requires_authentication(self):
        queryexamples_module = self._import_queryexamples_module()

        with TestClient(queryexamples_module.fast_app) as client:
            response = client.get("/api/queryexamples/databases")

        self.assertEqual(response.status_code, 401)

    def test_databases_returns_payload_for_authenticated_user(self):
        queryexamples_module = self._import_queryexamples_module()

        with patch.object(
            queryexamples_module,
            "get_current_user",
            new=AsyncMock(return_value={"oid": "user-1", "roles": ["Reader"]}),
        ), patch.object(queryexamples_module.DBHelper, "getDatabases", return_value=["db1", "db2"]):
            with TestClient(queryexamples_module.fast_app) as client:
                response = client.get("/api/queryexamples/databases")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"databases": ["db1", "db2"]})


class LlmProxyHttpRouteTests(unittest.TestCase):
    def _create_proxy_app(self):
        _clear_backend_modules(
            "app.settings",
            "shared.config.settings",
            "function_llm_proxy",
            "function_llm_proxy.__init__",
            "function_llm_proxy.appl.fastapi_app",
            "function_llm_proxy.appl.config",
        )

        with patch.dict(
            os.environ,
            {
                "AZURE_CLIENT_ID": "client-id",
                "AZURE_TENANT_ID": "tenant-id",
                "KEY_VAULT_CORE_URI": "https://example-vault.vault.azure.net/",
            },
            clear=False,
        ), patch(
            "app.services.secret_service.SecretService.get_secret_value",
            return_value="test-secret",
        ):
            import function_llm_proxy.appl.fastapi_app as fastapi_app_module

        usage_service = MagicMock()
        openai_client = MagicMock()

        async def validate(auth_header):
            if auth_header == "Bearer valid-token":
                return {"user_id": "user-1", "roles": ["Reader"]}
            raise PermissionError("Unauthorized")

        validator = MagicMock()
        validator.validate = AsyncMock(side_effect=validate)

        with patch.object(fastapi_app_module, "UsageService", return_value=usage_service), patch.object(
            fastapi_app_module, "OpenAIClient", return_value=openai_client
        ), patch.object(fastapi_app_module, "get_validator", return_value=validator):
            app = fastapi_app_module.create_fastapi_app()

        return app, usage_service

    def test_llm_healthz_requires_authentication(self):
        app, _usage_service = self._create_proxy_app()

        with TestClient(app) as client:
            response = client.get("/api/llm/healthz")

        self.assertEqual(response.status_code, 401)

    def test_llm_usage_today_requires_authentication(self):
        app, _usage_service = self._create_proxy_app()

        with TestClient(app) as client:
            response = client.get("/api/llm/usage/today")

        self.assertEqual(response.status_code, 401)

    def test_llm_usage_today_returns_usage_for_authenticated_user(self):
        app, usage_service = self._create_proxy_app()
        usage_service.get_today.return_value = {"user_id": "user-1", "total_tokens": 42}

        with TestClient(app) as client:
            response = client.get(
                "/api/llm/usage/today",
                headers={"Authorization": "Bearer valid-token"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"user_id": "user-1", "total_tokens": 42})


if __name__ == "__main__":
    unittest.main()
