"""T061: ShiftRecord model.

Updated for Feature 004: Shift Roster Calendar
- Added shift_type field for roster planning
- Added created_by field for audit trail
- entry_time/exit_time are now optional to support roster assignments
"""

import uuid
from datetime import UTC, date, datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class ShiftRecord(SQLModel, table=True):
    __tablename__ = "shift_record"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    employee_id: uuid.UUID = Field(foreign_key="employee.id", index=True)
    date: date = Field(index=True)  # Added index for roster queries
    shift_type: Optional[str] = Field(default=None, max_length=20)  # morning, afternoon, night
    entry_time: Optional[datetime] = Field(default=None)  # Optional for roster assignments
    exit_time: Optional[datetime] = Field(default=None)
    location_lat: Optional[float] = Field(default=None)
    location_lng: Optional[float] = Field(default=None)
    task_label: Optional[str] = Field(default=None, max_length=100)
    created_by: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id")  # Who assigned the shift
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC), index=True)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
