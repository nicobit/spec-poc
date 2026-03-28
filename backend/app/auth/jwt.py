# app/auth/jwt.py
import time
import httpx
import jwt
from jwt import PyJWKClient, InvalidTokenError
from typing import Dict, Any, Optional, Set, Iterable
from functools import lru_cache
from app.utils.nb_logger import NBLogger
from app.settings import TENANT_ID, AUDIENCE

logger = NBLogger().Log()

OIDC_TEMPLATE = "https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration"


def _rstrip_slash(s: Optional[str]) -> str:
    return (s or "").rstrip("/")


def _aud_list(aud_str: Optional[str]) -> Iterable[str]:
    """
    Support multiple acceptable audiences via comma-separated env var.
    Trims and ignores empties.
    """
    if not aud_str:
        return []
    return [x.strip() for x in aud_str.split(",") if x.strip()]


class AADValidator:
    def __init__(self, tenant_id: str, audience: str, allowed_tenants: str):
        self.tenant_id = tenant_id
        self.audience_values = list(_aud_list(audience)) or [audience]  # keep single if not CSV
        self.allowed_tenants = [t.strip() for t in allowed_tenants.split(",")] if allowed_tenants else ["*"]
        self._jwks_clients: Dict[str, PyJWKClient] = {}
        self._oidc_cache: Dict[str, Dict[str, Any]] = {}
        self._oidc_exp: Dict[str, float] = {}

    async def _get_oidc(self, tenant: str) -> Dict[str, Any]:
        now = time.time()
        if tenant in self._oidc_cache and self._oidc_exp.get(tenant, 0) > now:
            return self._oidc_cache[tenant]
        url = OIDC_TEMPLATE.format(tenant=tenant)
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
        # Cache 24h
        self._oidc_cache[tenant] = data
        self._oidc_exp[tenant] = now + 24 * 3600
        return data

    async def _get_jwks_client(self, tenant: str) -> PyJWKClient:
        if tenant in self._jwks_clients:
            return self._jwks_clients[tenant]
        oidc = await self._get_oidc(tenant)
        jwks_uri = oidc["jwks_uri"]
        self._jwks_clients[tenant] = PyJWKClient(jwks_uri)
        return self._jwks_clients[tenant]

    def _tenant_allowed(self, tid: str) -> bool:
        if "*" in self.allowed_tenants:
            return True
        return tid in self.allowed_tenants or tid == self.tenant_id

    def _build_valid_issuers(self, tid: str, oidc_issuer: str) -> Set[str]:
        """
        Allow-list of acceptable issuers for the tenant:
        - v2 issuer from OIDC metadata
        - v1 issuer: https://sts.windows.net/{tid}
        Both normalized (no trailing slash).
        """
        v2_issuer = _rstrip_slash(oidc_issuer)
        v1_issuer = _rstrip_slash(f"https://sts.windows.net/{tid}")
        return {v2_issuer, v1_issuer}

    async def validate(self, authorization: Optional[str]) -> Dict[str, Any]:
        if not authorization or not authorization.lower().startswith("bearer "):
            raise PermissionError("Missing or invalid Authorization header.")
        token = authorization.split(" ", 1)[1].strip()

        # Decode unverified to discover tenant (tid/iss)
        try:
            unverified = jwt.decode(token, options={"verify_signature": False})
        except InvalidTokenError as e:
            logger.error(f"JWT unverified decode failed: {e}")
            raise PermissionError("Invalid token.") from e

        tid = unverified.get("tid") or TENANT_ID
        iss_unverified = _rstrip_slash(unverified.get("iss"))
        ver_unverified = unverified.get("ver")  # '1.0' or '2.0'
        aud_unverified = unverified.get("aud")

        if not tid or not self._tenant_allowed(tid):
            logger.error(f"Tenant not allowed: tid={tid}, allowed={self.allowed_tenants}")
            raise PermissionError("Tenant not allowed.")

        # Resolve signing key
        jwks = await self._get_jwks_client(tid)
        try:
            signing_key = jwks.get_signing_key_from_jwt(token)
        except Exception as e:
            logger.error(f"Failed to get signing key from JWKS: {e}")
            raise PermissionError("Invalid token signature.") from e

        # OIDC metadata (v2)
        oidc = await self._get_oidc(tid)
        oidc_issuer = _rstrip_slash(oidc.get("issuer"))
        valid_issuers = self._build_valid_issuers(tid, oidc_issuer)

        logger.info(
            f"OIDC issuer: {oidc_issuer}; token.iss(unverified): {iss_unverified}; "
            f"ver={ver_unverified}; aud(unverified)={aud_unverified}; "
            f"valid_issuers={list(valid_issuers)}; accepted_audiences={self.audience_values}"
        )

        # Verify signature + audience; we'll check issuer manually
        try:
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=self.audience_values,   # accept any in list
                options={"verify_iss": False},   # manual issuer check below
            )
        except InvalidTokenError as e:
            logger.error(f"JWT decode (sig/aud) failed: {e}")
            # Helpful extra hint if it's an ID token or wrong resource
            if isinstance(aud_unverified, str) and aud_unverified in self.audience_values:
                pass
            else:
                logger.error(
                    "Audience likely mismatched. Ensure the client requests an **access token** "
                    "for your API scope (v2: 'api://<api-app-id>/.default' or a named scope) "
                    "or, for v1, uses the resource = Application ID URI."
                )
            raise PermissionError("Invalid token.") from e

        # Manual issuer check (normalized)
        iss = _rstrip_slash(claims.get("iss"))
        if iss not in valid_issuers:
            logger.error(f"Invalid issuer. token.iss={iss}; allowed={list(valid_issuers)}")
            raise PermissionError("Invalid issuer.")

        # user identity (prefer oid/sub/upn/email)
        user_id = (
            claims.get("oid")
            or claims.get("sub")
            or claims.get("preferred_username")
            or claims.get("upn")
            or claims.get("email")
        )
        if not user_id:
            logger.error("Cannot determine user identity from token (no oid/sub/preferred_username/upn/email).")
            raise PermissionError("Cannot determine user identity from token.")

        return {"claims": claims, "user_id": user_id, "tenant_id": tid}


@lru_cache()
def get_validator() -> AADValidator:
    
    # s.AUDIENCE can be "api://<api-id-guid>" or "api://<custom-uri>", optionally CSV for multiple.
    return AADValidator(TENANT_ID, AUDIENCE, TENANT_ID)
