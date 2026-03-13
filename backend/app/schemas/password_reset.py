"""Password Reset Schemas - Request/Response DTOs."""

from pydantic import BaseModel, EmailStr


class PasswordResetRequestSchema(BaseModel):
    """Schema for requesting password reset."""

    email: EmailStr


class PasswordResetRequestResponse(BaseModel):
    """Response when password reset is requested."""

    message: str
    expires_in_hours: int
    note: str


class PasswordResetVerifySchema(BaseModel):
    """Schema for verifying token and resetting password."""

    token: str
    new_password: str


class PasswordResetVerifyResponse(BaseModel):
    """Response when password is successfully reset."""

    message: str
    action: str
    redirect_url: str
    user: dict  # {id: str, email: str}
