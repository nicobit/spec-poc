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
    environment: Optional[str] = None  # display label
    environment_id: Optional[str] = None
    client: str
    client_id: Optional[str] = None
    stage: Optional[str] = None  # display label
    stage_id: Optional[str] = None
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
