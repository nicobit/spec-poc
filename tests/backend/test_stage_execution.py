import uuid

import backend.function_environment.__init__ as fe
import backend.function_scheduler_timer.__init__ as timer_mod
import backend.function_scheduler_worker.__init__ as worker_mod
from fastapi.testclient import TestClient

from shared import scheduler_store as mem_store
from shared.environment_store import get_environment
from shared.execution_store import STAGE_EXECUTIONS, upsert_stage_execution


def make_client_as_admin(monkeypatch):
    monkeypatch.setattr(
        fe,
        "get_current_user",
        lambda req: {"roles": ["admin"], "preferred_username": "test-admin"},
    )
    return TestClient(fe.fast_app)


def make_client_with_claims(monkeypatch, claims):
    monkeypatch.setattr(fe, "get_current_user", lambda req: claims)
    return TestClient(fe.fast_app)


def _build_execution(**overrides):
    payload = {
        "id": f"exec-{uuid.uuid4().hex[:8]}",
        "executionId": f"exec-{uuid.uuid4().hex[:8]}",
        "clientId": "client-001",
        "environmentId": "env-1",
        "stageId": "stage-dev-sql",
        "scheduleId": "sched-stage-start",
        "action": "start",
        "source": "schedule",
        "requestedAt": "2026-03-29T12:00:00Z",
        "requestedBy": "test-admin",
        "status": "succeeded",
        "resourceActionResults": [
            {
                "resourceActionId": "ra-1",
                "type": "sql-vm",
                "status": "succeeded",
                "subscriptionId": "sub-dev",
                "region": "eastus",
                "resourceIdentifier": "sqlvm-dev-01",
                "message": "VM started",
            }
        ],
        "message": "Execution delegated successfully",
        "correlationId": "corr-123",
        "environmentName": "dev-1",
        "stageName": "stage1",
    }
    payload.update(overrides)
    return payload


def test_environment_details_include_latest_stage_execution(monkeypatch):
    STAGE_EXECUTIONS.clear()
    upsert_stage_execution(_build_execution())
    client = make_client_as_admin(monkeypatch)

    response = client.get("/api/environments/env-1")
    assert response.status_code == 200

    body = response.json()
    stage = next(item for item in body["stages"] if item["id"] == "stage-dev-sql")
    assert stage["executionCount"] == 1
    assert stage["latestExecution"]["executionId"].startswith("exec-")
    assert body["executions"][0]["stageId"] == "stage-dev-sql"


def test_list_environment_stage_executions_can_filter_by_schedule(monkeypatch):
    STAGE_EXECUTIONS.clear()
    upsert_stage_execution(_build_execution(scheduleId="sched-a"))
    upsert_stage_execution(
        _build_execution(
            id=f"exec-{uuid.uuid4().hex[:8]}",
            executionId=f"exec-{uuid.uuid4().hex[:8]}",
            scheduleId="sched-b",
            requestedAt="2026-03-29T12:05:00Z",
        )
    )
    client = make_client_as_admin(monkeypatch)

    response = client.get("/api/environments/env-1/executions?schedule_id=sched-a")
    assert response.status_code == 200

    body = response.json()
    assert body["total"] == 1
    assert body["executions"][0]["scheduleId"] == "sched-a"


def test_get_stage_execution_detail_returns_single_execution(monkeypatch):
    STAGE_EXECUTIONS.clear()
    execution = upsert_stage_execution(_build_execution())
    client = make_client_as_admin(monkeypatch)

    response = client.get(f"/api/environments/executions/{execution['executionId']}")
    assert response.status_code == 200
    assert response.json()["execution"]["executionId"] == execution["executionId"]


def test_list_environment_stage_executions_rejects_stage_outside_environment(monkeypatch):
    STAGE_EXECUTIONS.clear()
    upsert_stage_execution(_build_execution())
    client = make_client_as_admin(monkeypatch)

    response = client.get("/api/environments/env-1/executions?stage_id=stage-does-not-belong")
    assert response.status_code == 400
    assert response.json()["detail"] == "stage_id does not belong to environment"


def test_client_admin_can_read_execution_history_for_owned_client(monkeypatch):
    STAGE_EXECUTIONS.clear()
    upsert_stage_execution(_build_execution(clientId="client-001"))
    client = make_client_with_claims(
        monkeypatch,
        {
            "roles": ["client-admin:client-001"],
            "preferred_username": "client-admin@example.com",
        },
    )

    response = client.get("/api/environments/env-1/executions")
    assert response.status_code == 200
    assert response.json()["total"] >= 1


def test_client_admin_cannot_read_execution_history_for_other_client(monkeypatch):
    STAGE_EXECUTIONS.clear()
    upsert_stage_execution(_build_execution(clientId="client-001"))
    client = make_client_with_claims(
        monkeypatch,
        {
            "roles": ["client-admin:client-999"],
            "preferred_username": "other-client-admin@example.com",
        },
    )

    response = client.get("/api/environments/env-1/executions")
    assert response.status_code == 403
    assert response.json()["detail"] == "Forbidden"


def test_get_stage_execution_detail_forbidden_without_matching_access(monkeypatch):
    STAGE_EXECUTIONS.clear()
    execution = upsert_stage_execution(_build_execution(clientId="client-001"))
    client = make_client_with_claims(
        monkeypatch,
        {
            "roles": ["client-admin:client-999"],
            "preferred_username": "other-client-admin@example.com",
        },
    )

    response = client.get(f"/api/environments/executions/{execution['executionId']}")
    assert response.status_code == 403
    assert response.json()["detail"] == "Forbidden"


def test_environment_manager_can_start_stage(monkeypatch):
    client = make_client_with_claims(
        monkeypatch,
        {
            "roles": ["environment-manager"],
            "preferred_username": "env-manager@example.com",
        },
    )

    response = client.post("/api/environments/env-1/stages/stage-dev-sql/start")
    assert response.status_code == 200
    assert response.json()["updated"]["status"] == "running"


def test_matching_client_admin_can_stop_stage(monkeypatch):
    client = make_client_with_claims(
        monkeypatch,
        {
            "roles": ["client-admin:client-001"],
            "preferred_username": "client-admin@example.com",
        },
    )

    response = client.post("/api/environments/env-1/stages/stage-dev-sql/stop")
    assert response.status_code == 200
    assert response.json()["updated"]["status"] == "stopped"


def test_non_matching_client_admin_cannot_start_stage(monkeypatch):
    client = make_client_with_claims(
        monkeypatch,
        {
            "roles": ["client-admin:client-999"],
            "preferred_username": "other-client-admin@example.com",
        },
    )

    response = client.post("/api/environments/env-1/stages/stage-dev-sql/start")
    assert response.status_code == 403
    assert response.json()["detail"] == "Forbidden"


def test_unauthorized_user_cannot_start_environment(monkeypatch):
    client = make_client_with_claims(
        monkeypatch,
        {
            "roles": ["reader"],
            "preferred_username": "reader@example.com",
        },
    )

    response = client.post("/api/environments/env-1/start")
    assert response.status_code == 403
    assert response.json()["detail"] == "Forbidden"


def test_control_endpoint_returns_canonical_identifiers_when_provided(monkeypatch):
    client = make_client_as_admin(monkeypatch)

    response = client.post(
        "/api/environments/control",
        json={
            "environment_id": "env-1",
            "client_id": "client-001",
            "stage_id": "stage-dev-sql",
            "action": "start",
            "executionId": "exec-control-1",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["environment_id"] == "env-1"
    assert body["client_id"] == "client-001"
    assert body["stage_id"] == "stage-dev-sql"
    assert body["action"] == "start"
    assert body["executionId"] == "exec-control-1"


def test_control_endpoint_rejects_missing_action(monkeypatch):
    client = make_client_as_admin(monkeypatch)

    response = client.post(
        "/api/environments/control",
        json={
            "environment_id": "env-1",
            "stage_id": "stage-dev-sql",
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Missing required field: action"


def test_worker_executes_service_bus_actions_directly(monkeypatch):
    STAGE_EXECUTIONS.clear()

    monkeypatch.setattr(
        worker_mod,
        "_load_stage_details",
        lambda environment_id, stage_id, stage_label: (
            {"id": "env-1", "name": "dev-1", "clientId": "client-001"},
            {
                "id": "stage-dev-sql",
                "name": "stage1",
                "resourceActions": [
                    {
                        "id": "ra-2",
                        "type": "service-bus-message",
                        "subscriptionId": "sub-dev",
                        "resourceGroup": "rg-dev-eastus",
                        "region": "eastus",
                        "properties": {
                            "namespace": "sb-dev",
                            "entityType": "queue",
                            "entityName": "environment-events",
                            "messageTemplate": "environment.lifecycle",
                        },
                    }
                ],
            },
        ),
    )
    monkeypatch.setattr(
        worker_mod,
        "execute_service_bus_message",
        lambda action, execution: {
            "entityName": "environment-events",
            "message": "Lifecycle event sent to queue environment-events",
        },
    )

    class DummyResponse:
        status_code = 200
        text = ""

        def raise_for_status(self):
            return None

    monkeypatch.setattr(worker_mod.requests, "post", lambda *args, **kwargs: DummyResponse())

    worker_mod.process_item(
        {
            "executionId": "exec-sb-1",
            "requestedAt": "2026-03-29T12:00:00Z",
            "environment": "dev-1",
            "environment_id": "env-1",
            "client": "Client 001",
            "client_id": "client-001",
            "stage": "stage1",
            "stage_id": "stage-dev-sql",
            "action": "start",
            "scheduleId": "sched-stage-start",
        }
    )

    execution = next(item for item in STAGE_EXECUTIONS if item["executionId"] == "exec-sb-1")
    assert execution["status"] == "succeeded"
    assert execution["resourceActionResults"][0]["status"] == "succeeded"
    assert "Lifecycle event sent" in execution["resourceActionResults"][0]["message"]


def test_timer_worker_flow_persists_execution_and_exposes_readback(monkeypatch):
    STAGE_EXECUTIONS.clear()
    mem_store.SCHEDULES.clear()
    client = make_client_as_admin(monkeypatch)

    mem_store.SCHEDULES.append(
        {
            "id": "sched-int-1",
            "environment": "dev-1",
            "environment_id": "env-1",
            "client": "Client 001",
            "client_id": "client-001",
            "stage": "stage1",
            "stage_id": "stage-dev-sql",
            "action": "start",
            "next_run": "2026-03-29T11:59:00+00:00",
            "enabled": True,
            "owner": "system",
        }
    )

    class DummyOut:
        def __init__(self):
            self.value = None

        def set(self, value):
            self.value = value

    monkeypatch.setattr(
        worker_mod,
        "_load_stage_details",
        lambda environment_id, stage_id, stage_label: (
            get_environment(environment_id),
            get_environment(environment_id)["stages"][0],
        ),
    )
    monkeypatch.setattr(
        worker_mod,
        "execute_sql_vm_lifecycle_action",
        lambda action, execution: {
            "vmName": action["properties"]["vmName"],
            "message": "VM started",
        },
    )
    monkeypatch.setattr(
        worker_mod,
        "execute_service_bus_message",
        lambda action, execution: {
            "entityName": action["properties"]["entityName"],
            "message": "Lifecycle event sent",
        },
    )

    out = DummyOut()
    timer_mod.main(mytimer=type("T", (), {"past_due": False}), outputQueueItem=out)
    assert out.value is not None

    payload = worker_mod.json.loads(out.value)
    assert len(payload) == 1
    message = payload[0]
    assert message["scheduleId"] == "sched-int-1"
    assert message["environment_id"] == "env-1"
    assert message["stage_id"] == "stage-dev-sql"

    worker_mod.process_item(message)

    execution = next(item for item in STAGE_EXECUTIONS if item["executionId"] == message["executionId"])
    assert execution["status"] == "succeeded"
    assert len(execution["resourceActionResults"]) == 2
    assert {item["status"] for item in execution["resourceActionResults"]} == {"succeeded"}

    details_response = client.get("/api/environments/env-1")
    assert details_response.status_code == 200
    details_stage = next(item for item in details_response.json()["stages"] if item["id"] == "stage-dev-sql")
    assert details_stage["latestExecution"]["executionId"] == message["executionId"]
    assert details_stage["latestExecution"]["status"] == "succeeded"

    history_response = client.get("/api/environments/env-1/executions")
    assert history_response.status_code == 200
    assert any(item["executionId"] == message["executionId"] for item in history_response.json()["executions"])


def test_timer_worker_flow_surfaces_partial_failure_in_history(monkeypatch):
    STAGE_EXECUTIONS.clear()
    mem_store.SCHEDULES.clear()
    client = make_client_as_admin(monkeypatch)

    mem_store.SCHEDULES.append(
        {
            "id": "sched-int-2",
            "environment": "dev-1",
            "environment_id": "env-1",
            "client": "Client 001",
            "client_id": "client-001",
            "stage": "stage1",
            "stage_id": "stage-dev-sql",
            "action": "stop",
            "next_run": "2026-03-29T11:59:00+00:00",
            "enabled": True,
            "owner": "system",
        }
    )

    class DummyOut:
        def __init__(self):
            self.value = None

        def set(self, value):
            self.value = value

    monkeypatch.setattr(
        worker_mod,
        "_load_stage_details",
        lambda environment_id, stage_id, stage_label: (
            get_environment(environment_id),
            get_environment(environment_id)["stages"][0],
        ),
    )
    monkeypatch.setattr(
        worker_mod,
        "execute_sql_vm_lifecycle_action",
        lambda action, execution: {
            "vmName": action["properties"]["vmName"],
            "message": "VM deallocated",
        },
    )

    def _fail_service_bus(action, execution):
        raise RuntimeError("Service Bus dispatch failed")

    monkeypatch.setattr(worker_mod, "execute_service_bus_message", _fail_service_bus)

    out = DummyOut()
    timer_mod.main(mytimer=type("T", (), {"past_due": False}), outputQueueItem=out)
    payload = worker_mod.json.loads(out.value)
    message = payload[0]

    worker_mod.process_item(message)

    execution = next(item for item in STAGE_EXECUTIONS if item["executionId"] == message["executionId"])
    assert execution["status"] == "partially_failed"
    assert {item["status"] for item in execution["resourceActionResults"]} == {"succeeded", "failed"}

    history_response = client.get("/api/environments/env-1/executions")
    assert history_response.status_code == 200
    history_item = next(item for item in history_response.json()["executions"] if item["executionId"] == message["executionId"])
    assert history_item["status"] == "partially_failed"


def test_worker_executes_sql_vm_actions_directly(monkeypatch):
    STAGE_EXECUTIONS.clear()

    monkeypatch.setattr(
        worker_mod,
        "_load_stage_details",
        lambda environment_id, stage_id, stage_label: (
            {"id": "env-1", "name": "dev-1", "clientId": "client-001"},
            {
                "id": "stage-dev-sql",
                "name": "stage1",
                "resourceActions": [
                    {
                        "id": "ra-1",
                        "type": "sql-vm",
                        "subscriptionId": "sub-dev",
                        "resourceGroup": "rg-dev-eastus",
                        "region": "eastus",
                        "properties": {"vmName": "sqlvm-dev-01"},
                    }
                ],
            },
        ),
    )
    monkeypatch.setattr(
        worker_mod,
        "execute_sql_vm_lifecycle_action",
        lambda action, execution: {
            "vmName": "sqlvm-dev-01",
            "message": "SQL VM sqlvm-dev-01 start requested",
        },
    )

    class DummyResponse:
        status_code = 200
        text = ""

        def raise_for_status(self):
            return None

    monkeypatch.setattr(worker_mod.requests, "post", lambda *args, **kwargs: DummyResponse())

    worker_mod.process_item(
        {
            "executionId": "exec-vm-1",
            "requestedAt": "2026-03-29T12:00:00Z",
            "environment": "dev-1",
            "environment_id": "env-1",
            "client": "Client 001",
            "client_id": "client-001",
            "stage": "stage1",
            "stage_id": "stage-dev-sql",
            "action": "start",
            "scheduleId": "sched-stage-start",
        }
    )

    execution = next(item for item in STAGE_EXECUTIONS if item["executionId"] == "exec-vm-1")
    assert execution["status"] == "succeeded"
    assert execution["resourceActionResults"][0]["status"] == "succeeded"
    assert "sqlvm-dev-01" in execution["resourceActionResults"][0]["message"]


def test_worker_executes_synapse_sql_pool_actions_directly(monkeypatch):
    STAGE_EXECUTIONS.clear()

    monkeypatch.setattr(
        worker_mod,
        "_load_stage_details",
        lambda environment_id, stage_id, stage_label: (
            {"id": "env-2", "name": "qa-1", "clientId": "client-002"},
            {
                "id": "stage-qa-live",
                "name": "live",
                "resourceActions": [
                    {
                        "id": "ra-3",
                        "type": "synapse-sql-pool",
                        "subscriptionId": "sub-qa",
                        "resourceGroup": "rg-qa-we",
                        "region": "westeurope",
                        "properties": {
                            "workspaceName": "synapse-qa-we",
                            "sqlPoolName": "qa_dw",
                        },
                    }
                ],
            },
        ),
    )
    monkeypatch.setattr(
        worker_mod,
        "execute_synapse_sql_pool_action",
        lambda action, execution: {
            "workspaceName": "synapse-qa-we",
            "sqlPoolName": "qa_dw",
            "message": "Synapse SQL pool synapse-qa-we/qa_dw resume requested",
        },
    )

    class DummyResponse:
        status_code = 200
        text = ""

        def raise_for_status(self):
            return None

    monkeypatch.setattr(worker_mod.requests, "post", lambda *args, **kwargs: DummyResponse())

    worker_mod.process_item(
        {
            "executionId": "exec-synapse-1",
            "requestedAt": "2026-03-29T12:20:00Z",
            "environment": "qa-1",
            "environment_id": "env-2",
            "client": "Client 002",
            "client_id": "client-002",
            "stage": "live",
            "stage_id": "stage-qa-live",
            "action": "start",
            "scheduleId": "sched-stage-start",
        }
    )

    execution = next(item for item in STAGE_EXECUTIONS if item["executionId"] == "exec-synapse-1")
    assert execution["status"] == "succeeded"
    assert execution["resourceActionResults"][0]["status"] == "succeeded"
    assert "synapse-qa-we/qa_dw" in execution["resourceActionResults"][0]["message"]


def test_worker_executes_sql_managed_instance_actions_directly(monkeypatch):
    STAGE_EXECUTIONS.clear()

    monkeypatch.setattr(
        worker_mod,
        "_load_stage_details",
        lambda environment_id, stage_id, stage_label: (
            {"id": "env-2", "name": "qa-1", "clientId": "client-002"},
            {
                "id": "stage-qa-live",
                "name": "live",
                "resourceActions": [
                    {
                        "id": "ra-4",
                        "type": "sql-managed-instance",
                        "subscriptionId": "sub-qa",
                        "resourceGroup": "rg-qa-we",
                        "region": "westeurope",
                        "properties": {
                            "managedInstanceName": "sqlmi-qa-01",
                        },
                    }
                ],
            },
        ),
    )
    monkeypatch.setattr(
        worker_mod,
        "execute_sql_managed_instance_action",
        lambda action, execution: {
            "managedInstanceName": "sqlmi-qa-01",
            "message": "SQL Managed Instance sqlmi-qa-01 start requested",
        },
    )

    class DummyResponse:
        status_code = 200
        text = ""

        def raise_for_status(self):
            return None

    monkeypatch.setattr(worker_mod.requests, "post", lambda *args, **kwargs: DummyResponse())

    worker_mod.process_item(
        {
            "executionId": "exec-mi-1",
            "requestedAt": "2026-03-29T12:30:00Z",
            "environment": "qa-1",
            "environment_id": "env-2",
            "client": "Client 002",
            "client_id": "client-002",
            "stage": "live",
            "stage_id": "stage-qa-live",
            "action": "start",
            "scheduleId": "sched-stage-start",
        }
    )

    execution = next(item for item in STAGE_EXECUTIONS if item["executionId"] == "exec-mi-1")
    assert execution["status"] == "succeeded"
    assert execution["resourceActionResults"][0]["status"] == "succeeded"
    assert "sqlmi-qa-01" in execution["resourceActionResults"][0]["message"]


def test_worker_marks_partial_failure_when_service_bus_fails(monkeypatch):
    STAGE_EXECUTIONS.clear()

    monkeypatch.setattr(
        worker_mod,
        "_load_stage_details",
        lambda environment_id, stage_id, stage_label: (
            {"id": "env-1", "name": "dev-1", "clientId": "client-001"},
            {
                "id": "stage-dev-sql",
                "name": "stage1",
                "resourceActions": [
                    {
                        "id": "ra-1",
                        "type": "sql-vm",
                        "subscriptionId": "sub-dev",
                        "resourceGroup": "rg-dev-eastus",
                        "region": "eastus",
                        "properties": {"vmName": "sqlvm-dev-01"},
                    },
                    {
                        "id": "ra-2",
                        "type": "service-bus-message",
                        "subscriptionId": "sub-dev",
                        "resourceGroup": "rg-dev-eastus",
                        "region": "eastus",
                        "properties": {
                            "namespace": "sb-dev",
                            "entityType": "queue",
                            "entityName": "environment-events",
                            "messageTemplate": "environment.lifecycle",
                        },
                    },
                ],
            },
        ),
    )

    def _raise(*args, **kwargs):
        raise RuntimeError("service bus dispatch failed")

    monkeypatch.setattr(
        worker_mod,
        "execute_sql_vm_lifecycle_action",
        lambda action, execution: {
            "vmName": "sqlvm-dev-01",
            "message": "SQL VM sqlvm-dev-01 stop requested",
        },
    )
    monkeypatch.setattr(worker_mod, "execute_service_bus_message", _raise)

    class DummyResponse:
        status_code = 200
        text = ""

        def raise_for_status(self):
            return None

    monkeypatch.setattr(worker_mod.requests, "post", lambda *args, **kwargs: DummyResponse())

    worker_mod.process_item(
        {
            "executionId": "exec-sb-2",
            "requestedAt": "2026-03-29T12:10:00Z",
            "environment": "dev-1",
            "environment_id": "env-1",
            "client": "Client 001",
            "client_id": "client-001",
            "stage": "stage1",
            "stage_id": "stage-dev-sql",
            "action": "stop",
            "scheduleId": "sched-stage-stop",
        }
    )

    execution = next(item for item in STAGE_EXECUTIONS if item["executionId"] == "exec-sb-2")
    assert execution["status"] == "partially_failed"
    result_by_id = {item["resourceActionId"]: item for item in execution["resourceActionResults"]}
    assert result_by_id["ra-1"]["status"] == "succeeded"
    assert result_by_id["ra-2"]["status"] == "failed"
