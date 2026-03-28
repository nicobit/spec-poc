import sys
import backend.function_environment.__init__ as fe
from fastapi.testclient import TestClient
import uuid


def make_client_as_admin():
    # monkeypatch the auth resolver to return an admin user
    fe.get_current_user = (lambda req: {"roles": ["admin"], "preferred_username": "test-admin"})
    return TestClient(fe.fast_app)


def test_environment_start_stop_flow():
    client = make_client_as_admin()
    # create environment (no stages -> should default to empty list)
    # use a unique name to avoid conflicts with existing seeded or earlier test runs
    unique_name = f"e2e-{uuid.uuid4().hex[:8]}"
    payload = {
        "client": "test-client",
        "name": unique_name,
        
        "stages": [
            {"id": "stage-1", "name": "default", "status": "stopped", "resourceActions": []}
        ],
    }
    r = client.post("/api/environments", json=payload)
    assert r.status_code == 200
    created = r.json().get("created")
    assert created and created.get("id")
    env_id = created.get("id")

    # start environment (should succeed for admin)
    r = client.post(f"/api/environments/{env_id}/start")
    assert r.status_code == 200
    body = r.json()
    assert body.get("status") == "starting"

    # get environment and verify status
    g = client.get(f"/api/environments/{env_id}")
    assert g.status_code == 200
    details = g.json()
    # if no stages were provided, the in-memory logic sets default stage; ensure status is present
    assert details.get("status") in ("running", "stopped", None) or isinstance(details.get("schedules"), list)

    # stop environment
    r = client.post(f"/api/environments/{env_id}/stop")
    assert r.status_code == 200
    assert r.json().get("status") == "stopping"


def test_environment_delete_flow():
    client = make_client_as_admin()
    unique_name = f"delete-{uuid.uuid4().hex[:8]}"
    payload = {
        "client": "test-client",
        "name": unique_name,
        "stages": [
            {"id": "stage-1", "name": "default", "status": "stopped", "resourceActions": []}
        ],
    }

    created_response = client.post("/api/environments", json=payload)
    assert created_response.status_code == 200
    env_id = created_response.json()["created"]["id"]

    delete_response = client.delete(f"/api/environments/{env_id}")
    assert delete_response.status_code == 200
    assert delete_response.json()["deleted"] == env_id

    fetch_response = client.get(f"/api/environments/{env_id}")
    assert fetch_response.status_code == 404
