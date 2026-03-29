from __future__ import annotations

import json
from typing import Any, Dict

from .execution_identity import build_execution_credential


def _fully_qualified_namespace(namespace: str) -> str:
    value = str(namespace or "").strip()
    if not value:
        raise ValueError("Service Bus namespace is required")
    if "." in value:
        return value
    return f"{value}.servicebus.windows.net"


def build_service_bus_lifecycle_payload(resource_action: Dict[str, Any], execution: Dict[str, Any]) -> Dict[str, Any]:
    properties = dict(resource_action.get("properties") or {})
    message_template = properties.get("messageTemplate")

    payload = {
        "eventType": "stage.lifecycle.requested",
        "requestedAction": execution.get("action"),
        "clientId": execution.get("clientId"),
        "environmentId": execution.get("environmentId"),
        "stageId": execution.get("stageId"),
        "executionId": execution.get("executionId"),
        "requestedAt": execution.get("requestedAt"),
        "source": execution.get("source"),
        "scheduleId": execution.get("scheduleId"),
        "correlationId": execution.get("correlationId"),
        "environmentName": execution.get("environmentName"),
        "stageName": execution.get("stageName"),
        "metadata": {
            "messageTemplate": message_template,
            "resourceActionId": resource_action.get("id"),
            "resourceType": resource_action.get("type"),
        },
    }

    return {key: value for key, value in payload.items() if value is not None}


def execute_service_bus_message(resource_action: Dict[str, Any], execution: Dict[str, Any]) -> Dict[str, Any]:
    from azure.servicebus import ServiceBusClient, ServiceBusMessage

    properties = dict(resource_action.get("properties") or {})
    namespace = _fully_qualified_namespace(properties.get("namespace"))
    entity_type = str(properties.get("entityType") or "").strip().lower()
    entity_name = str(properties.get("entityName") or "").strip()
    if entity_type not in {"queue", "topic"}:
        raise ValueError("Service Bus entityType must be 'queue' or 'topic'")
    if not entity_name:
        raise ValueError("Service Bus entityName is required")

    payload = build_service_bus_lifecycle_payload(resource_action, execution)
    credential = build_execution_credential()
    message = ServiceBusMessage(
        json.dumps(payload),
        message_id=execution.get("executionId"),
        application_properties={
            "eventType": payload.get("eventType"),
            "requestedAction": payload.get("requestedAction"),
            "stageId": payload.get("stageId"),
            "environmentId": payload.get("environmentId"),
        },
        subject=str(payload.get("requestedAction") or ""),
    )

    with ServiceBusClient(fully_qualified_namespace=namespace, credential=credential) as client:
        if entity_type == "queue":
            with client.get_queue_sender(queue_name=entity_name) as sender:
                sender.send_messages(message)
        else:
            with client.get_topic_sender(topic_name=entity_name) as sender:
                sender.send_messages(message)

    return {
        "namespace": namespace,
        "entityType": entity_type,
        "entityName": entity_name,
        "payload": payload,
        "message": f"Lifecycle event sent to {entity_type} {entity_name}",
    }
