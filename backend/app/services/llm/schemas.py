from pydantic import BaseModel
from typing import List


class AiAnswerModel(BaseModel):
    answer: str
    remediation: List[str] = []
    references: List[str] = []
