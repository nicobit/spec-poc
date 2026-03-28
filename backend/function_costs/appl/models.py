from pydantic import BaseModel, Field
from typing import List, Optional

class IncreaseItem(BaseModel):
    service_name: str = Field(..., description="Azure Cost dimension: ServiceName")
    current_cost: float
    previous_cost: float
    pct_change: Optional[float] = None
    abs_change: Optional[float] = None
    share_of_increase_pct: Optional[float] = None

class IncreaseResponse(BaseModel):
    scope: str
    currency: str
    granularity: str
    period_current: str
    period_previous: str
    items: List[IncreaseItem]

class TopDriversResponse(BaseModel):
    scope: str
    currency: str
    granularity: str
    period_current: str
    period_previous: str
    total_increase: float
    drivers: List[IncreaseItem]
