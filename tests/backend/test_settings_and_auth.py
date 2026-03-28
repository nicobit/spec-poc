import importlib
import os
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


VALID_APPINSIGHTS_CONNECTION_STRING = (
    "InstrumentationKey=00000000-0000-0000-0000-000000000000;"
    "IngestionEndpoint=https://westeurope-0.in.applicationinsights.azure.com/"
)


def _clear_backend_modules(*names: str) -> None:
    for name in names:
        sys.modules.pop(name, None)


def import_context_module():
    _clear_backend_modules("app.context", "app.services.authentication_service")
    with patch.dict(
        os.environ,
        {"APPLICATIONINSIGHTS_CONNECTION_STRING": VALID_APPINSIGHTS_CONNECTION_STRING},
        clear=False,
    ), patch("requests.get") as mock_get:
        mock_get.return_value.json.return_value = {"keys": []}
        import app.context as context_module

    return context_module


def import_roles_module():
    _clear_backend_modules("app.auth.roles", "app.auth.jwt")
    with patch.dict(
        os.environ,
        {"APPLICATIONINSIGHTS_CONNECTION_STRING": VALID_APPINSIGHTS_CONNECTION_STRING},
        clear=False,
    ):
        import app.auth.roles as roles_module

    return roles_module


class SettingsTests(unittest.TestCase):
    def test_settings_support_legacy_env_aliases(self):
        with patch.dict(
            os.environ,
            {
                "EMDEDDING_MODEL": "legacy-embedding-model",
                "REDIS_COONECTION_STRING_SECRET_NAME": "legacy-redis-secret",
            },
            clear=False,
        ):
            import app.settings as settings_module

            settings_module = importlib.reload(settings_module)

            self.assertEqual(settings_module.EMBEDDING_MODEL, "legacy-embedding-model")
            self.assertEqual(
                settings_module.REDIS_CONNECTION_STRING_SECRET_NAME,
                "legacy-redis-secret",
            )
            self.assertEqual(
                settings_module.REDIS_COONECTION_STRING_SECRET_NAME,
                "legacy-redis-secret",
            )


class ContextAuthTests(unittest.IsolatedAsyncioTestCase):
    async def test_get_current_user_rejects_missing_bearer_token(self):
        context_module = import_context_module()

        request = SimpleNamespace(headers={})

        with self.assertRaises(HTTPException) as caught:
            await context_module.get_current_user(request)

        self.assertEqual(caught.exception.status_code, 401)

    async def test_get_current_user_returns_claims_for_valid_token(self):
        context_module = import_context_module()

        request = SimpleNamespace(headers={"Authorization": "Bearer token-value"})

        with patch.object(context_module, "verify_jwt", return_value={"oid": "user-123", "roles": ["Admin"]}):
            claims = await context_module.get_current_user(request)

        self.assertEqual(claims["oid"], "user-123")
        self.assertEqual(claims["roles"], ["Admin"])


class RoleCheckerTests(unittest.IsolatedAsyncioTestCase):
    async def test_role_checker_allows_authenticated_user_when_no_roles_required(self):
        RoleChecker = import_roles_module().RoleChecker

        checker = RoleChecker()
        user = {"roles": ["Reader"]}

        result = await checker(user)

        self.assertEqual(result, user)

    async def test_role_checker_blocks_missing_admin_role(self):
        RoleChecker = import_roles_module().RoleChecker

        checker = RoleChecker("Admin")

        with self.assertRaises(HTTPException) as caught:
            await checker({"roles": ["Reader"]})

        self.assertEqual(caught.exception.status_code, 403)

    async def test_role_checker_accepts_admin_role(self):
        RoleChecker = import_roles_module().RoleChecker

        checker = RoleChecker("Admin")
        user = {"roles": ["Admin", "Reader"]}

        result = await checker(user)

        self.assertEqual(result, user)


if __name__ == "__main__":
    unittest.main()
