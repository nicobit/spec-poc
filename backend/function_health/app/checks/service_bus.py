from typing import Optional, Dict, Any
import anyio
from app.services.secret_service import SecretService

async def _sync_service_bus_ping(namespace: Optional[str], entity: Optional[Dict[str, str]]) -> Dict[str, Any]:
    if not namespace:
        return {"skipped": True, "reason": "namespace not set"}
    from azure.identity import DefaultAzureCredential
    from azure.servicebus import ServiceBusClient

    cred = SecretService.credential()
    sbc = ServiceBusClient(fully_qualified_namespace=namespace, credential=cred)

    etype = (entity or {}).get("type")
    if etype == "queue":
        q = (entity or {}).get("queue_name")
        if not q:
            return {"skipped": True, "reason": "entity.queue_name not set"}
        with sbc.get_queue_receiver(queue_name=q) as receiver:
            msgs = receiver.peek_messages(max_message_count=1)
            return {"skipped": False, "method": "peek_messages", "entity": "queue", "queue": q, "peeked": len(msgs)}
    elif etype == "subscription":
        topic = (entity or {}).get("topic_name")
        sub = (entity or {}).get("subscription_name")
        if not topic or not sub:
            return {"skipped": True, "reason": "entity.topic_name and entity.subscription_name required"}
        with sbc.get_subscription_receiver(topic_name=topic, subscription_name=sub) as receiver:
            msgs = receiver.peek_messages(max_message_count=1)
            return {"skipped": False, "method": "peek_messages", "entity": "subscription", "topic": topic, "subscription": sub, "peeked": len(msgs)}
    else:
        return {"skipped": True, "reason": "entity.type must be 'queue' or 'subscription'"}

async def check_service_bus(namespace: Optional[str], entity: Optional[Dict[str, str]]) -> Dict[str, Any]:
    return await anyio.to_thread.run_sync(_sync_service_bus_ping, namespace, entity)
