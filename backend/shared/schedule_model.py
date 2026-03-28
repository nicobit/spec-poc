from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class NotificationGroup(BaseModel):
    id: str
    name: str
    recipients: List[str] = Field(default_factory=list)


class PostponementPolicy(BaseModel):
    enabled: bool = True
    maxPostponeMinutes: Optional[int] = None
    maxPostponements: int = 1


class Schedule(BaseModel):
    id: str
    environment: str  # e.g., DEV, AIT, UAT, PP, PROD
    client: str
    stage: Optional[str] = None  # e.g., stage1, stage2, live
    action: str  # 'start' or 'stop'
    cron: Optional[str] = None
    timezone: Optional[str] = 'UTC'
    next_run: Optional[datetime] = None
    enabled: bool = True
    owner: Optional[str] = None
    notify_before_minutes: int = 30
    notification_groups: List[NotificationGroup] = Field(default_factory=list)
    postponement_policy: Optional[PostponementPolicy] = None
    postponement_count: int = 0
    postponed_until: Optional[datetime] = None
    postponed_by: Optional[str] = None
    postpone_reason: Optional[str] = None
    last_notified_at: Optional[datetime] = None
