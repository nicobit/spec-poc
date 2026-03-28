from typing import TypeVar, TypedDict


class SystemState(TypedDict):
    execution_history: list = []
    chat_history: list = []
    errors: dict = {}
    executing_tool: str = ""
    task: str = ""
    executed_at: str = ""
    execution_time: float = 0.0
    proceed: bool = True

    


T = TypeVar("SystemState", bound=SystemState)