from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional

class CheckResult(BaseModel):
    name: str
    status: str  # "pass" | "fail" | "skip"
    latency_ms: Optional[float] = None
    error: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class HealthResponse(BaseModel):
    status: str  # overall: pass|fail|degraded
    results: List[CheckResult] = Field(default_factory=list)

# Config payloads
class ServiceConfig(BaseModel):
    name: str
    type: str
    enabled: bool = True
    config: Dict[str, Any] = Field(default_factory=dict)

class ServicesConfig(BaseModel):
    default_timeout_seconds: Optional[float] = None
    services: List[ServiceConfig] = Field(default_factory=list)

class StoredConfig(BaseModel):
    etag: Optional[str] = None
    config: ServicesConfig
