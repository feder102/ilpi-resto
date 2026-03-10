"""TimeRecord model for Feature 005: Employee Time Tracking.

Immutable clock-in/out records for time tracking. Each entry captures when an
employee clocked in and clocked out on a specific date.

Key Design:
- Immutable: timestamps cannot be edited after creation
- Audit-friendly: all records are historical
- Row-Level Security: enforced at service layer (employees can only see own records)
"""

import uuid
from datetime import UTC, datetime, date as date_type

from sqlmodel import Field, SQLModel


class TimeRecord(SQLModel, table=True):
    __tablename__ = "time_record"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    employee_id: uuid.UUID = Field(foreign_key="employee.id", index=True)
    date: date_type = Field(index=True)  # Date of the clock-in (not timestamp)
    clock_in_timestamp: datetime = Field()  # When employee clicked "Clock In" (server time)
    clock_out_timestamp: datetime | None = Field(default=None)  # When employee clicked "Clock Out" (if clocked out)
    location_lat: float | None = Field(default=None)  # Future: geolocation tracking
    location_lng: float | None = Field(default=None)  # Future: geolocation tracking
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))  # Record creation time (immutable)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))  # Last update (only when clock_out)
