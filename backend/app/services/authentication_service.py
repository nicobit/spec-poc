import base64
import json

from app.utils.nb_logger import NBLogger


logger = NBLogger(__name__).Log()


def _pad_base64url(value: str) -> str:
    remainder = len(value) % 4
    if remainder == 0:
        return value
    return value + ("=" * (4 - remainder))


def verify_jwt(token: str):
    # Legacy helper: decodes claims without signature verification.
    # Prefer app.auth.jwt.AADValidator for protected FastAPI routes.
    try:
        _header_b64, payload_b64, _signature_b64 = token.split(".")
        payload = base64.urlsafe_b64decode(_pad_base64url(payload_b64)).decode("utf-8")
        return json.loads(payload)
    except Exception as ex:
        logger.error(f"Error decoding JWT: {ex}")
        return None
