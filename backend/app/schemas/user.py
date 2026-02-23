"""T047b: User management Pydantic DTOs."""

import re
import uuid

from pydantic import BaseModel, EmailStr, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str
    employee_id: uuid.UUID | None = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        if not re.search(r"[A-Z]", v):
            raise ValueError("La contraseña debe contener al menos una mayúscula")
        if not re.search(r"[a-z]", v):
            raise ValueError("La contraseña debe contener al menos una minúscula")
        if not re.search(r"\d", v):
            raise ValueError("La contraseña debe contener al menos un dígito")
        return v


class UserUpdate(BaseModel):
    role: str | None = None
    password: str | None = None
    employee_id: uuid.UUID | None = None
    is_active: bool | None = None


class UserListItem(BaseModel):
    id: uuid.UUID
    email: str
    role: str
    employee_id: uuid.UUID | None
    is_active: bool
    created_at: str
