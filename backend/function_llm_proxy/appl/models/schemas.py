# app/models/schemas.py
from pydantic import BaseModel
from typing import Any, Dict, Optional, List

# We keep generic schemas to pass through requests mainly unchanged.
class ChatCompletionRequest(BaseModel):
    messages: List[Dict[str, Any]]
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    top_p: Optional[float] = None
    frequency_penalty: Optional[float] = None
    presence_penalty: Optional[float] = None
    stop: Optional[Any] = None
    stream: Optional[bool] = False
    response_format: Optional[Dict[str, Any]] = None
    tools: Optional[List[Dict[str, Any]]] = None
    tool_choice: Optional[Any] = None
    seed: Optional[int] = None
    user: Optional[str] = None
    extra_headers: Optional[Dict[str, str]] = None

class EmbeddingsRequest(BaseModel):
    input: Any
    model: Optional[str] = None
    encoding_format: Optional[str] = None

class UsageRow(BaseModel):
    date: str
    user_id: str
    model: Optional[str] = None
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    quota: int

class UsageRangeResponse(BaseModel):
    user_id: str
    from_date: str
    to_date: str
    total_prompt_tokens: int
    total_completion_tokens: int
    total_tokens: int
    daily: List[UsageRow]
