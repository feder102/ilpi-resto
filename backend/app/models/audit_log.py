"""AuditLog model — generic append-only audit trail."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import Index
from sqlmodel import Field, SQLModel


class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_log"
    __table_args__ = (
        Index("idx_audit_log_tenant_id", "tenant_id"),
        Index("idx_audit_log_entity", "tenant_id", "entity_type", "entity_id"),
        Index("idx_audit_log_created_at", "tenant_id", "created_at"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id")
    entity_type: str = Field(max_length=100)
    entity_id: str = Field(max_length=100)
    action: str = Field(max_length=100)
    old_value: str | None = Field(default=None)
    new_value: str | None = Field(default=None)
    changed_by: uuid.UUID = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
