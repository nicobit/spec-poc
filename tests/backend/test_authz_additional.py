from backend.shared.authz import get_roles_from_claims, has_client_admin_for
import os


def test_get_roles_from_claims_various_shapes(monkeypatch):
    # roles as list
    claims = {"roles": ["Admin", "Environment-Manager"]}
    r = get_roles_from_claims(claims)
    assert "admin" in r
    assert "environment-manager" in r

    # roles as comma-separated string
    claims = {"roles": "client-admin:client-a, viewer"}
    r = get_roles_from_claims(claims)
    assert "client-admin:client-a" in r
    assert "viewer" in r

    # roles as list of dicts
    claims = {"roles": [{"value": "Admin"}, {"role": "EnvAdmin"}]}
    r = get_roles_from_claims(claims)
    assert "admin" in r
    assert "envadmin" in r

    # scopes (scp) as space separated
    claims = {"scp": "read write"}
    r = get_roles_from_claims(claims)
    assert "read" in r and "write" in r

    # groups mapping via env var
    monkeypatch.setenv("AAD_GROUP_ROLE_MAP", '{"group-a":"client-admin"}')
    claims = {"groups": ["group-a"]}
    r = get_roles_from_claims(claims)
    assert "client-admin" in r


def test_has_client_admin_for_various_shapes(monkeypatch):
    # direct scoped role
    claims = {"roles": ["client-admin:client-x"]}
    assert has_client_admin_for(claims, "client-x")

    # generic client-admin with client claim
    claims = {"roles": ["client-admin"], "client": "Client-Y"}
    assert has_client_admin_for(claims, "client-y")

    # client_ids as comma-separated string
    claims = {"roles": ["client-admin"], "client_ids": "client-a,client-b"}
    assert has_client_admin_for(claims, "client-b")
