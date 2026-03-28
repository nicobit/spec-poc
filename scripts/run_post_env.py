import backend.function_environment.__init__ as fe
from fastapi.testclient import TestClient

async def _fake_user(req):
    return {"roles": ["admin"], "preferred_username": "test"}

fe.get_current_user = _fake_user
client = TestClient(fe.fast_app)

payload = {"client": "client-a", "name": "dev-1"}

r1 = client.post('/api/environments', json=payload)
print('r1', r1.status_code, r1.text)

r2 = client.post('/api/environments', json=payload)
print('r2', r2.status_code, r2.text)
