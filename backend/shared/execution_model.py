from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


ExecutionSource = Literal["portal", "schedule"]
ExecutionStatus = Literal["pending", "in_progress", "succeeded", "partially_failed", "failed"]
ExecutionActionStatus = Literal["pending", "in_progress", "succeeded", "failed", "skipped"]


class StageExecutionActionResult(BaseModel):
    resourceActionId: str
    type: str
    status: ExecutionActionStatus
    subscriptionId: Optional[str] = None
    region: Optional[str] = None
    resourceIdentifier: Optional[str] = None
    message: Optional[str] = None
    errorCode: Optional[str] = None
    startedAt: Optional[str] = None
    completedAt: Optional[str] = None


class StageExecution(BaseModel):
    id: str
    executionId: str
    clientId: str
    environmentId: str
    stageId: str
    scheduleId: Optional[str] = None
    action: Literal["start", "stop"]
    source: ExecutionSource
    requestedAt: str
    requestedBy: Optional[str] = None
    startedAt: Optional[str] = None
    completedAt: Optional[str] = None
    status: ExecutionStatus
    resourceActionResults: List[StageExecutionActionResult] = Field(default_factory=list)
    message: Optional[str] = None
    correlationId: Optional[str] = None
    environmentName: Optional[str] = None
    stageName: Optional[str] = None

