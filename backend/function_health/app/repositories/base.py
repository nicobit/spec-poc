from typing import Dict, Any, Optional, Tuple
import abc

class ConfigRepository(abc.ABC):
    @abc.abstractmethod
    async def get_config(self) -> Tuple[Dict[str, Any], Optional[str]]:
        ...

    @abc.abstractmethod
    async def save_config(self, data: Dict[str, Any], etag: Optional[str] = None) -> str:
        ...
