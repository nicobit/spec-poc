import sys
import unittest
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


class AsgiRuntimeTests(unittest.TestCase):
    def test_runtime_app_reports_loaded_and_failed_subapps(self):
        from runtimes.asgi.app import create_app

        def loaded_app() -> FastAPI:
            app = FastAPI()

            @app.get("/loaded/ping")
            async def ping():
                return {"ok": True}

            return app

        def failing_app() -> FastAPI:
            raise RuntimeError("missing config")

        app = create_app(
            subapps=(
                ("loaded", loaded_app),
                ("failing", failing_app),
            )
        )

        with TestClient(app) as client:
            root_response = client.get("/")
            health_response = client.get("/runtime/healthz")
            ping_response = client.get("/loaded/ping")

        self.assertEqual(root_response.status_code, 200)
        self.assertEqual(root_response.json()["runtime"], "asgi")

        self.assertEqual(health_response.status_code, 200)
        self.assertEqual(health_response.json()["status"], "degraded")
        self.assertEqual(health_response.json()["subapps"]["loaded"]["status"], "loaded")
        self.assertEqual(health_response.json()["subapps"]["failing"]["status"], "failed")

        self.assertEqual(ping_response.status_code, 200)
        self.assertEqual(ping_response.json(), {"ok": True})


if __name__ == "__main__":
    unittest.main()
