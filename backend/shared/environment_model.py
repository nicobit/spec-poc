from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class NotificationGroup(BaseModel):
    id: Optional[str] = None
    name: str
    recipients: List[str] = Field(default_factory=list)


class PostponementPolicy(BaseModel):
    enabled: bool = True
    maxPostponeMinutes: Optional[int] = None
    maxPostponements: Optional[int] = None


class ResourceDescriptor(BaseModel):
    id: Optional[str] = None
    type: str
    subscriptionId: Optional[str] = None
    resourceGroup: Optional[str] = None
    # free-form service-specific properties
    properties: Optional[Dict[str, Any]] = None


class StageModel(BaseModel):
    id: str
    name: str
    status: Optional[str] = "stopped"
    resourceActions: List[ResourceDescriptor] = Field(default_factory=list)
    notificationGroups: List[NotificationGroup] = Field(default_factory=list)
    postponementPolicy: Optional[PostponementPolicy] = None
    azureConfig: Optional[Dict[str, Any]] = None


class Owner(BaseModel):
    id: Optional[str] = None
    principalId: str
    displayName: Optional[str] = None
    role: str


class EnvironmentModel(BaseModel):
    id: str
    name: str
    client: str
    clientId: Optional[str] = None
    region: Optional[str] = None
    status: Optional[str] = "stopped"
    lifecycle: Optional[str] = None
    tags: Optional[Dict[str, str]] = None
    owner: Optional[str] = None
    owners: List[Owner] = Field(default_factory=list)
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    stages: List[StageModel] = Field(default_factory=list)

    class Config:
        extra = "allow"
