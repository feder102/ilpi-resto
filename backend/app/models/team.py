"""T012: Team model — department string replaced with FK (Feature 014)."""

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.department import Department


class Team(SQLModel, table=True):
    """Team with reference to ShiftType instead of raw shift times."""

    __tablename__ = "team"
    __table_args__ = (
        UniqueConstraint("tenant_id", "name", "department_id", name="uq_team_tenant_name_dept"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    shift_type_id: uuid.UUID = Field(foreign_key="shift_type.id", index=True)
    name: str = Field(max_length=100)
    department_id: uuid.UUID = Field(foreign_key="department.id", index=True)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Relationships
    department: Optional["Department"] = Relationship(back_populates="teams")

    @property
    def total_hours(self) -> float:
        """Get total hours from associated shift type."""
        return 0.0  # Placeholder - actual value comes from shift_type relationship
