"""Password Reset Token Model

Represents a single-use, time-limited token for password reset functionality.
"""

from datetime import datetime
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class PasswordResetToken(SQLModel, table=True):
    """Password reset token entity for password recovery flow."""

    __tablename__ = "password_reset_tokens"

    # Primary Key
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Foreign Keys
    tenant_id: UUID = Field(foreign_key="tenant.id", index=True)
    user_id: UUID = Field(foreign_key="user.id", index=True)

    # Token Data
    token_hash: str = Field(max_length=255, index=True, description="SHA256 hash of reset token (never plaintext)")

    # Expiration & Usage
    expires_at: datetime = Field(index=True, description="Token expiration time (24 hours from creation)")
    used_at: datetime | None = Field(default=None, description="Timestamp when token was used (NULL if unused)")

    # Audit
    ip_address: str = Field(max_length=45, description="IPv4 or IPv6 address that requested reset")
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
