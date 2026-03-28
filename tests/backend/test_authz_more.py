from backend.shared.authz import get_roles_from_claims, has_any_role
import os


def test_has_any_role_synonyms():
    # allowed requests environment-manager, user has several synonyms
    allowed = ["environment-manager"]
    claims = {"roles": ["envadmin", "some-other"]}
    assert has_any_role(claims, allowed)

    claims = {"roles": ["environment-admin"]}
    assert has_any_role(claims, allowed)

    claims = {"roles": ["env-manager"]}
    assert has_any_role(claims, allowed)


def test_has_any_role_client_scoped_matching():
    allowed = ["client-admin:client-a"]
    claims = {"roles": ["client-admin:client-a"]}
    assert has_any_role(claims, allowed)

    # different client should not match
    claims = {"roles": ["client-admin:otherclient"]}
    assert not has_any_role(claims, allowed)


def test_get_roles_empty_and_composite(monkeypatch):
    assert get_roles_from_claims({}) == []

    # composite role string should split when comma present
    claims = {"roles": "role1 role2,role3"}
    r = get_roles_from_claims(claims)
    assert "role1 role2" in r or "role3" in r


def test_group_map_malformed_envvar(monkeypatch):
    # malformed JSON mapping should be ignored and not raise
    monkeypatch.setenv("AAD_GROUP_ROLE_MAP", "not-a-json")
    claims = {"groups": ["g1"]}
    r = get_roles_from_claims(claims)
    assert isinstance(r, list)
