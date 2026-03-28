# app/services/usage_service.py
from datetime import datetime, timezone, date
from typing import Optional, Tuple, Dict, Any, List
from function_llm_proxy.appl.config import get_settings
from function_llm_proxy.appl.repos.azure_table_repository import AzureTableUsageRepository

class UsageService:
    def __init__(self):
        self.settings = get_settings()
        self._repo = None

    @property
    def repo(self):
        if self._repo is None:
            repo = AzureTableUsageRepository()
            repo.ensure()
            self._repo = repo
        return self._repo

    def _today_key(self) -> str:
        # UTC date key for consistency across regions
        return datetime.now(timezone.utc).strftime("%Y%m%d")

    def check_quota_or_raise(self, user_id: str):
        if not self.settings.ENFORCE_QUOTA:
            return
        today = self._today_key()
        row = self.repo.get_day(user_id, today)
        quota = self.settings.DEFAULT_DAILY_QUOTA
        if row:
            quota = int(row.get("quota", quota))
            total = int(row.get("total_tokens", 0))
            if total >= quota:
                raise PermissionError(f"Daily quota exceeded: {total}/{quota} tokens.")

    def add_usage(self, user_id: str, prompt_tokens: int, completion_tokens: int, model: Optional[str]) -> Dict[str, Any]:
        today = self._today_key()
        updated = self.repo.upsert_day(
            user_id=user_id,
            yyyymmdd=today,
            delta_prompt=prompt_tokens,
            delta_completion=completion_tokens,
            model=model,
            default_quota=self.settings.DEFAULT_DAILY_QUOTA
        )
        return updated

    def set_quota(self, user_id: str, quota: int) -> None:
        self.repo.set_quota(user_id, quota)

    def get_today(self, user_id: str) -> Dict[str, Any]:
        today = self._today_key()
        row = self.repo.get_day(user_id, today) or {
            "PartitionKey": user_id,
            "RowKey": today,
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
            "quota": self.settings.DEFAULT_DAILY_QUOTA,
            "model": ""
        }
        return row

    def get_range(self, user_id: str, from_date: date, to_date: date) -> List[Dict[str, Any]]:
        return self.repo.get_range(user_id, from_date, to_date)
