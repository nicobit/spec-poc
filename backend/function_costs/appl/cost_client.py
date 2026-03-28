import datetime as dt
from typing import Any, Dict, List, Tuple
import httpx
from azure.identity import DefaultAzureCredential
from .settings import settings
from shared.services.secret_service import SecretService

class CostClient:
    def __init__(self):
        self.cred = SecretService.credential()

    async def _arm_token(self) -> str:
        tok = self.cred.get_token(settings.arm_scope)
        return tok.token

    def _scope_url(self, scope: str) -> str:
        base = settings.arm_resource.rstrip("/")
        api = settings.cost_api_version
        return f"{base}{scope}/providers/Microsoft.CostManagement/query?api-version={api}"

    @staticmethod
    def _parse(columns: List[Dict[str, Any]], rows: List[List[Any]]) -> List[Dict[str, Any]]:
        keys = [c["name"] for c in columns]
        return [{k: v for k, v in zip(keys, r)} for r in rows]

    async def query_monthly_by_service(
        self, scope: str, start: dt.date, end: dt.date
    ) -> Tuple[str, List[Dict]]:
        url = self._scope_url(scope)
        body = {
            "type": "ActualCost",
            "timeframe": "Custom",
            "timePeriod": {"from": f"{start}T00:00:00Z", "to": f"{end}T00:00:00Z"},
            "dataSet": {
                "granularity": "Monthly",
                "aggregation": {"totalCost": {"name": "Cost", "function": "Sum"}},
                "grouping": [{"type": "Dimension", "name": "ServiceName"}],
            },
        }
        headers = {"Authorization": f"Bearer {await self._arm_token()}"}
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(url, json=body, headers=headers)
            r.raise_for_status()
            data = r.json()
        currency = data.get("properties", {}).get("columns", [{}])[0].get("unit", "USD")
        return currency, self._parse(data["properties"]["columns"], data["properties"]["rows"])

    async def query_daily_by_service(
        self, scope: str, start: dt.date, end: dt.date
    ) -> Tuple[str, List[Dict]]:
        url = self._scope_url(scope)
        body = {
            "type": "ActualCost",
            "timeframe": "Custom",
            "timePeriod": {"from": f"{start}T00:00:00Z", "to": f"{end}T00:00:00Z"},
            "dataSet": {
                "granularity": "Daily",
                "aggregation": {"totalCost": {"name": "Cost", "function": "Sum"}},
                "grouping": [{"type": "Dimension", "name": "ServiceName"}],
            },
        }
        headers = {"Authorization": f"Bearer {await self._arm_token()}"}
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(url, json=body, headers=headers)
            r.raise_for_status()
            data = r.json()
        currency = data.get("properties", {}).get("columns", [{}])[0].get("unit", "USD")
        return currency, self._parse(data["properties"]["columns"], data["properties"]["rows"])
