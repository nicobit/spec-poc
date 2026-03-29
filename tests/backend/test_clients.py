from fastapi.testclient import TestClient

import backend.function_environment.__init__ as fe


def make_client_with_roles(roles):
    fe.get_current_user = lambda req: {"roles": roles, "preferred_username": "test-admin@example.com"}
    return TestClient(fe.fast_app)


def test_list_clients_for_environment_manager():
    client = make_client_with_roles(["environment-manager"])
    response = client.get("/api/clients")
    assert response.status_code == 200
    body = response.json()
    assert "clients" in body
    assert len(body["clients"]) >= 1


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


def test_create_client_requires_admin():
    client = make_client_with_roles(["environment-manager"])
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
