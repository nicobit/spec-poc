from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

import backend.function_environment.__init__ as fe
from shared.client_store import CLIENTS


def make_client_with_roles(roles):
    fe.get_current_user = lambda req: {"roles": roles, "preferred_username": "test-admin@example.com"}
    return TestClient(fe.fast_app)


@pytest.fixture(autouse=True)
def reset_clients():
    snapshot = deepcopy(CLIENTS)
    yield
    CLIENTS.clear()
    CLIENTS.extend(snapshot)


def test_list_clients_for_environment_manager():
    client = make_client_with_roles(["environment-manager"])
    response = client.get("/api/clients")
    assert response.status_code == 200
    body = response.json()
    assert "clients" in body
    assert len(body["clients"]) >= 1


def test_get_client_for_environment_manager():
    client = make_client_with_roles(["environment-manager"])
    response = client.get("/api/clients/client-001")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == "client-001"
    assert body["shortCode"] == "CLIENT-001"


def test_create_update_and_retire_client():
    client = make_client_with_roles(["admin"])

    create_response = client.post(
        "/api/clients",
        json={
            "name": "Contoso Switzerland",
            "shortCode": "CONTOSO-CH",
            "country": "CH",
            "timezone": "Europe/Zurich",
            "clientAdmins": [{"type": "user", "id": "owner@contoso.com"}],
        },
    )
    assert create_response.status_code == 200
    created = create_response.json()["created"]
    assert created["shortCode"] == "CONTOSO-CH"
    assert created["retired"] is False

    update_response = client.put(
        f"/api/clients/{created['id']}",
        json={
            "name": "Contoso Switzerland Updated",
            "shortCode": "CONTOSO-CH",
            "country": "CH",
            "timezone": "Europe/Berlin",
            "clientAdmins": [{"type": "user", "id": "owner@contoso.com"}],
        },
    )
    assert update_response.status_code == 200
    updated = update_response.json()["updated"]
    assert updated["name"] == "Contoso Switzerland Updated"
    assert updated["timezone"] == "Europe/Berlin"

    retire_response = client.post(
        f"/api/clients/{created['id']}/retire",
        json={"reason": "No longer active"},
    )
    assert retire_response.status_code == 200
    retired = retire_response.json()["updated"]
    assert retired["retired"] is True
    assert retired["retiredBy"] == "test-admin@example.com"


def test_environment_manager_can_create_update_and_retire_client():
    client = make_client_with_roles(["environment-manager"])

    create_response = client.post(
        "/api/clients",
        json={
            "name": "Environment Managed Client",
            "shortCode": "ENV-MGR-001",
            "country": "CH",
            "timezone": "Europe/Zurich",
            "clientAdmins": [{"type": "user", "id": "owner@example.com"}],
        },
    )
    assert create_response.status_code == 200
    created = create_response.json()["created"]

    update_response = client.put(
        f"/api/clients/{created['id']}",
        json={
            "name": "Environment Managed Client Updated",
            "shortCode": "ENV-MGR-001",
            "country": "DE",
            "timezone": "Europe/Berlin",
            "clientAdmins": [{"type": "user", "id": "owner@example.com"}],
        },
    )
    assert update_response.status_code == 200
    assert update_response.json()["updated"]["country"] == "DE"

    retire_response = client.post(
        f"/api/clients/{created['id']}/retire",
        json={"reason": "No longer active"},
    )
    assert retire_response.status_code == 200
    assert retire_response.json()["updated"]["retired"] is True


def test_create_client_rejects_duplicate_shortcode():
    client = make_client_with_roles(["admin"])
    response = client.post(
        "/api/clients",
        json={
            "name": "Client Duplicate",
            "shortCode": "CLIENT-001",
            "country": "CH",
            "timezone": "Europe/Zurich",
            "clientAdmins": [{"type": "user", "id": "dup@example.com"}],
        },
    )
    assert response.status_code == 409


def test_create_client_rejects_invalid_country():
    client = make_client_with_roles(["admin"])
    response = client.post(
        "/api/clients",
        json={
            "name": "Invalid Country Client",
            "shortCode": "INVALID-COUNTRY-001",
            "country": "CHE",
            "timezone": "Europe/Zurich",
            "clientAdmins": [{"type": "user", "id": "owner@example.com"}],
        },
    )

    assert response.status_code == 400
    assert "country must be a 2-letter country code" in str(response.json()["detail"])


def test_create_client_rejects_invalid_timezone():
    client = make_client_with_roles(["admin"])
    response = client.post(
        "/api/clients",
        json={
            "name": "Invalid Timezone Client",
            "shortCode": "INVALID-TZ-001",
            "country": "CH",
            "timezone": "Europe/Definitely-Not-A-Timezone",
            "clientAdmins": [{"type": "user", "id": "owner@example.com"}],
        },
    )

    assert response.status_code == 400
    assert "timezone must be a valid IANA timezone" in str(response.json()["detail"])


def test_create_client_rejects_invalid_client_admin_email():
    client = make_client_with_roles(["admin"])
    response = client.post(
        "/api/clients",
        json={
            "name": "Invalid Admin Email Client",
            "shortCode": "INVALID-ADMIN-001",
            "country": "CH",
            "timezone": "Europe/Zurich",
            "clientAdmins": [{"type": "user", "id": "not-an-email"}],
        },
    )

    assert response.status_code == 400
    assert "valid email address" in str(response.json()["detail"])


def test_create_client_requires_management_role():
    client = make_client_with_roles(["viewer"])
    response = client.post(
        "/api/clients",
        json={
            "name": "Forbidden Client",
            "shortCode": "FORBIDDEN-001",
            "country": "CH",
            "timezone": "Europe/Zurich",
            "clientAdmins": [{"type": "user", "id": "owner@example.com"}],
        },
    )
    assert response.status_code == 403


def test_get_client_requires_management_role():
    client = make_client_with_roles(["viewer"])
    response = client.get("/api/clients/client-001")

    assert response.status_code == 403


def test_retire_client_returns_not_found_for_missing_id():
    client = make_client_with_roles(["admin"])
    response = client.post("/api/clients/client-missing/retire", json={"reason": "Missing"})

    assert response.status_code == 404
    assert response.json()["detail"] == "Client not found"
