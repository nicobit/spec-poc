import sys
from fastapi.testclient import TestClient

# ensure backend package is importable when running this script directly
if 'backend' not in sys.path:
    sys.path.insert(0, 'backend')

import backend.function_environment.__init__ as fe


async def _fake_user(req):
    return {"roles":["admin"], "preferred_username":"test"}

fe.get_current_user = _fake_user
client = TestClient(fe.fast_app)
r = client.post('/api/environments', json={"client":"client-a","name":"dev-1","type":"VM"})
print('status', r.status_code)
try:
    print('json:', r.json())
except Exception:
    print('text:', r.text)
