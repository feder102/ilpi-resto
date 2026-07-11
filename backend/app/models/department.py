"""T004: Department model — ABM de Departamentos (Feature 014)."""

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

import sqlalchemy as sa
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.employee import Employee
    from app.models.team import Team


class Department(SQLModel, table=True):
    __tablename__ = "department"
    __table_args__ = (
        # Case-insensitive unique name per tenant — functional index created in migration
        sa.Index("ix_department_tenant_active", "tenant_id", "is_active"),
        sa.Index("ix_department_tenant_system", "tenant_id", "is_system"),
        # Note: no CheckConstraint declared here — the "~" regex operator is
        # PostgreSQL-only and breaks SQLite-backed test metadata.create_all().
        # The equivalent ck_department_color_hex constraint is created by the
        # Alembic migration (20260626_add_departments_table) for real databases.
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    name: str = Field(max_length=60)
    description: str | None = Field(default=None, max_length=255)
    color: str = Field(default="#6b7280", max_length=7)
    icon: str = Field(default="Building2", max_length=40)
    is_system: bool = Field(default=False)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Relationships
    employees: list["Employee"] = Relationship(back_populates="department")
    teams: list["Team"] = Relationship(back_populates="department")
