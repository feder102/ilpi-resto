"""T061: ShiftRecord model."""

import uuid
from datetime import date, datetime, timezone

from sqlmodel import Field, SQLModel


class ShiftRecord(SQLModel, table=True):
    __tablename__ = "shift_record"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    employee_id: uuid.UUID = Field(foreign_key="employee.id", index=True)
    date: date
    entry_time: datetime
    exit_time: datetime | None = Field(default=None)
    location_lat: float | None = Field(default=None)
    location_lng: float | None = Field(default=None)
    task_label: str | None = Field(default=None, max_length=100)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
