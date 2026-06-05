"""
TimeEntry model for automatic shift-based time tracking.

Records auto-generated work hours based on assigned shifts.
Designed to support both automatic (shift-based) and future manual tracking.
"""

import uuid
from datetime import UTC, date, datetime, time
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.employee import Employee
    from app.models.shift_record import ShiftRecord
    from app.models.shift_type import ShiftType


class TimeEntrySource(str, Enum):
    """Enum for time entry source tracking."""
    SHIFT = "shift"      # Auto-generated from shift assignment
    MANUAL = "manual"    # User-clocked in (legacy/future phase)
    EXTRA = "extra"      # Overtime added manually by Admin/Moderador


class TimeEntry(SQLModel, table=True):
    """
    Time entry record for employee work hours.

    Automatically generated from ShiftRecord assignments.
    Supports timezone-aware shift times and handles overnight shifts.
    Includes source field for future manual tracking support.
    """
    __tablename__ = "time_entries"

    # Primary Key
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    # Multi-tenant & Employee
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    employee_id: uuid.UUID = Field(foreign_key="employee.id", index=True)

    # Shift Information
    shift_date: date = Field(index=True)                    # Date of the shift/work
    # Nullable: extra-hours entries (source=EXTRA) have no schedule
    start_time: Optional[time] = Field(default=None, nullable=True)  # Shift start time (e.g., 22:00)
    end_time: Optional[time] = Field(default=None, nullable=True)    # Shift end time (e.g., 06:00)
    hours_worked: Decimal = Field(decimal_places=2, max_digits=5)  # Duration in hours

    # Source Tracking (shift = auto from roster, extra = overtime added by admin)
    source: TimeEntrySource = Field(default=TimeEntrySource.SHIFT)

    # Optional reason/note (used for extra-hours entries)
    note: Optional[str] = Field(default=None, max_length=255, nullable=True)

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Foreign Keys (optional for relationships)
    shift_record_id: Optional[uuid.UUID] = Field(default=None, foreign_key="shift_record.id", nullable=True)
    shift_type_id: Optional[uuid.UUID] = Field(default=None, foreign_key="shift_type.id", nullable=True)

    # Relationships
    employee: Optional["Employee"] = Relationship(back_populates="time_entries")
    shift_record: Optional["ShiftRecord"] = Relationship(back_populates="time_entry")
    shift_type: Optional["ShiftType"] = Relationship()

    # Table Constraints
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "employee_id",
            "shift_date",
            "shift_type_id",
            name="uq_time_entry_employee_date_shift"
        ),
    )

    class Config:
        """SQLModel configuration."""
        from_attributes = True
        arbitrary_types_allowed = True
