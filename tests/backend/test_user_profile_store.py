from shared.user_profile_store import get_user_profile_store


def test_inmemory_set_and_get():
    store = get_user_profile_store()
    # ensure in-memory fallback works in test environment
    user_id = "test-user-1"
    store.set_favorites(user_id, ["env-a", "env-b"])
    favs = store.get_favorites(user_id)
    assert favs == ["env-a", "env-b"]

    store.add_favorite(user_id, "env-c")
    assert store.get_favorites(user_id) == ["env-a", "env-b", "env-c"]

    store.remove_favorite(user_id, "env-b")
    assert store.get_favorites(user_id) == ["env-a", "env-c"]
