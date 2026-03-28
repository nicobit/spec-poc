import time
import asyncio
from typing import Awaitable, Callable, Tuple, Any

async def timed_call(fn: Callable[[], Awaitable[Any]], timeout_s: float) -> Tuple[float, Any, Exception | None]:
    start = time.perf_counter()
    try:
        result = await asyncio.wait_for(fn(), timeout=timeout_s)
        return ((time.perf_counter() - start) * 1000.0, result, None)
    except Exception as e:
        return ((time.perf_counter() - start) * 1000.0, None, e)
