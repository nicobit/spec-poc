# app/utils/token_counter.py
from typing import List, Dict, Any
import tiktoken

def estimate_prompt_tokens(messages: List[Dict[str, Any]], model: str = "gpt-4o-mini") -> int:
    try:
        enc = tiktoken.encoding_for_model(model)
    except Exception:
        enc = tiktoken.get_encoding("cl100k_base")
    count = 0
    for m in messages:
        for k in ("role", "content", "name"):
            v = m.get(k)
            if isinstance(v, str):
                count += len(enc.encode(v))
            elif isinstance(v, list):
                # tool calls etc.
                for part in v:
                    if isinstance(part, dict):
                        for vv in part.values():
                            if isinstance(vv, str):
                                count += len(enc.encode(vv))
    # Add small overhead per message
    count += 5 * len(messages)
    return count
