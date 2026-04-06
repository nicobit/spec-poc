from datetime import datetime, timezone
from typing import List, Optional

from croniter import croniter
from pydantic import BaseModel, Field

from shared.timezone_support import get_timezone_info


class ScheduleIn(BaseModel):
    environment: Optional[str] = None
    environment_id: Optional[str] = None
    client: Optional[str] = None
    client_id: Optional[str] = None
    stage: Optional[str] = None
    stage_id: Optional[str] = None
    action: str
    cron: Optional[str] = None
    timezone: Optional[str] = "UTC"
    enabled: bool = True
    owner: Optional[str] = None
    notify_before_minutes: int = 30
    notification_groups: List[dict] = Field(default_factory=list)
    postponement_policy: Optional[dict] = None


class StageConfigurationIn(BaseModel):
    resourceActions: List[dict] = Field(default_factory=list)
    notificationGroups: List[dict] = Field(default_factory=list)
    postponementPolicy: Optional[dict] = None


class StageIn(BaseModel):
    name: str
    status: Optional[str] = "stopped"


class OwnerIn(BaseModel):
    principalId: str
    displayName: Optional[str] = None
    role: str


class PostponeIn(BaseModel):
    postponeUntil: Optional[str] = None
    postponeByMinutes: Optional[int] = None
    reason: Optional[str] = None


class ClientAdminAssignmentIn(BaseModel):
    type: str = "user"
    id: str
    displayName: Optional[str] = None


class ClientIn(BaseModel):
    name: str
    shortCode: str
    country: str
    timezone: str
    clientAdmins: List[ClientAdminAssignmentIn] = Field(default_factory=list)


class ClientRetireIn(BaseModel):
    reason: Optional[str] = None


class ClientsBulkRetireIn(BaseModel):
    ids: List[str]
    reason: Optional[str] = None


class EnvironmentIn(BaseModel):
    name: str
    region: Optional[str] = None
    client: Optional[str] = None
    clientId: Optional[str] = None
    stages: Optional[List[dict]] = None


class EnvironmentUpdate(BaseModel):
    name: Optional[str] = None
    region: Optional[str] = None
    client: Optional[str] = None
    clientId: Optional[str] = None
    stages: Optional[List[dict]] = None
    displayOrder: Optional[int] = None


def compute_next_run(cron_expr: str, tz: str) -> str:
    tzinfo = get_timezone_info(tz)
    now = datetime.now(tzinfo)
    iterator = croniter(cron_expr, now)
    next_run = iterator.get_next(datetime)
    return next_run.astimezone(timezone.utc).isoformat()
