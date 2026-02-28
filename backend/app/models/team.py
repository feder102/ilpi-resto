"""T060: Team model with shift type integration."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class Team(SQLModel, table=True):
    """Team with reference to ShiftType instead of raw shift times."""

    __tablename__ = "team"
    __table_args__ = (
        UniqueConstraint("tenant_id", "name", "department", name="uq_team_tenant_name_dept"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    shift_type_id: uuid.UUID = Field(foreign_key="shift_type.id", index=True)
    name: str = Field(max_length=100)
    department: str
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def total_hours(self) -> float:
        """Get total hours from associated shift type."""
        # Note: This property requires the shift_type relationship to be loaded
        # It will be populated in the response via service layer
        return 0.0  # Placeholder - actual value comes from shift_type relationship
