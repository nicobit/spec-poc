import os
from shared.authz import get_roles_from_claims, has_any_role


def test_roles_from_claims_simple_list():
    claims = {"roles": ["admin", "user"]}
    roles = get_roles_from_claims(claims)
    assert "admin" in roles
    assert "user" in roles


def test_roles_from_claims_string():
    claims = {"role": "environment-manager"}
    roles = get_roles_from_claims(claims)
    assert "environment-manager" in roles


def test_group_mapping(monkeypatch):
    # map group GUID to role
    mapping = {"group-guid-1": "environment-manager"}
    monkeypatch.setenv('AAD_GROUP_ROLE_MAP', os.environ.get('AAD_GROUP_ROLE_MAP', '') or __import__('json').dumps(mapping))
    claims = {"groups": ["group-guid-1"]}
    roles = get_roles_from_claims(claims)
    assert "environment-manager" in roles


def test_has_any_role_true():
    claims = {"roles": ["admin"]}
    assert has_any_role(claims, ["admin"]) is True


def test_has_any_role_false():
    claims = {"roles": ["user"]}
    assert has_any_role(claims, ["admin"]) is False
