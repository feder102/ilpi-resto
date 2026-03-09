"""T034: Auth Pydantic DTOs."""

import uuid

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    role: str
    tenant_id: uuid.UUID
    employee_id: uuid.UUID | None
    is_active: bool  # Feature 005: Flag for password setup requirement


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenPayload(BaseModel):
    sub: str
    tenant_id: str
    role: str
    emp_id: str | None
    exp: int
    iat: int


# Feature 005: Password Setup Schemas
class PasswordSetupRequest(BaseModel):
    token: str
    password: str
    password_confirm: str


class PasswordSetupResponse(BaseModel):
    message: str
    redirect_url: str
