from __future__ import annotations

import re
from typing import List, Optional

from pydantic import BaseModel, Field, ValidationInfo, field_validator

from .timezone_support import is_valid_iana_timezone

EMAIL_PATTERN = r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$"


class ClientAdminAssignment(BaseModel):
    type: str = "user"
    id: str
    displayName: Optional[str] = None

    @field_validator("type")
    @classmethod
    def validate_type(cls, value: str) -> str:
        if str(value).lower() != "user":
            raise ValueError("clientAdmins assignments must use type 'user'")
        return "user"

    @field_validator("id")
    @classmethod
    def validate_id(cls, value: str) -> str:
        normalized = str(value or "").strip()
        if not normalized:
            raise ValueError("clientAdmins assignments require an email address")

        if not re.match(EMAIL_PATTERN, normalized):
            raise ValueError("clientAdmins assignments must use a valid email address")
        return normalized


class ClientModel(BaseModel):
    id: str
    name: str
    shortCode: str
    country: str
    timezone: str
    clientAdmins: List[ClientAdminAssignment] = Field(default_factory=list)
    retired: bool = False
    retiredAt: Optional[str] = None
    retiredBy: Optional[str] = None

    @field_validator("id", "name", "shortCode", "country")
    @classmethod
    def validate_required_text(cls, value: str, info: ValidationInfo):
        normalized = str(value or "").strip()
        if not normalized:
            raise ValueError(f"{info.field_name} is required")
        return normalized

    @field_validator("country")
    @classmethod
    def validate_country(cls, value: str) -> str:
        normalized = str(value).strip().upper()
        if len(normalized) != 2 or not normalized.isalpha():
            raise ValueError("country must be a 2-letter country code")
        return normalized

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: str) -> str:
        normalized = str(value or "").strip()
        if not normalized:
            raise ValueError("timezone is required")
        if not is_valid_iana_timezone(normalized):
            raise ValueError("timezone must be a valid IANA timezone")
        return normalized

    @field_validator("clientAdmins")
    @classmethod
    def validate_client_admins(cls, value: List[ClientAdminAssignment]) -> List[ClientAdminAssignment]:
        if not value:
            raise ValueError("clientAdmins is required")
        return value
