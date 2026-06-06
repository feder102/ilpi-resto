"""T061: ShiftRecord model.

Updated for Feature 004: Shift Roster Calendar
- Added shift_type field for roster planning
- Added created_by field for audit trail
- entry_time/exit_time are now optional to support roster assignments
"""

import uuid
from datetime import UTC, datetime
from datetime import date as date_type
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.time_entry import TimeEntry


class ShiftRecord(SQLModel, table=True):
    __tablename__ = "shift_record"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    employee_id: uuid.UUID = Field(foreign_key="employee.id", index=True)
    date: date_type = Field(index=True)  # Added index for roster queries
    shift_type_id: uuid.UUID | None = Field(default=None, foreign_key="shift_type.id", index=True)  # FK to shift_type
    entry_time: datetime | None = Field(default=None)  # Optional for roster assignments
    exit_time: datetime | None = Field(default=None)
    location_lat: float | None = Field(default=None)
    location_lng: float | None = Field(default=None)
    task_label: str | None = Field(default=None)
    created_by: uuid.UUID | None = Field(default=None, foreign_key="user.id")  # Who assigned the shift
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC), index=True)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Relationships
    time_entry: Optional["TimeEntry"] = Relationship(back_populates="shift_record")
