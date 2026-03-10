"""T033: User model."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    __tablename__ = "user"
    __table_args__ = (
        UniqueConstraint("tenant_id", "email", name="uq_user_tenant_email"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    email: str = Field(max_length=255)
    hashed_password: str | None = Field(default=None)  # Nullable for password setup flow
    role: str  # Admin, Moderador, Empleado
    employee_id: uuid.UUID | None = Field(default=None, foreign_key="employee.id", unique=True)
    is_active: bool = Field(default=True)
    password_reset_token: str | None = Field(default=None, unique=True)  # Feature 005: Password setup token
    password_reset_expires: datetime | None = Field(default=None)  # Feature 005: Token expiration
    last_login: datetime | None = Field(default=None)  # Feature 005: Audit trail
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
