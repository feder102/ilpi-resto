"""Time Tracking Pydantic DTOs for Feature 005.

Schemas for clock-in/out operations and time record management.
"""

import uuid
from datetime import datetime
from pydantic import BaseModel


class TimeRecordResponse(BaseModel):
    """Read-only time record response."""
    id: uuid.UUID
    employee_id: uuid.UUID
    date: str  # YYYY-MM-DD format
    clock_in_timestamp: datetime
    clock_out_timestamp: datetime | None
    class Config:
        from_attributes = True


class ClockInResponse(BaseModel):
    """Clock-in successful response."""
    time_record: TimeRecordResponse
    status: str  # "clocked-in"
    message: str


class ClockOutResponse(BaseModel):
    """Clock-out successful response."""
    time_record: TimeRecordResponse
    status: str  # "clocked-out"
    summary: dict  # {total_hours, total_minutes, formatted, clock_in, clock_out}
    message: str


class TimeRecordListResponse(BaseModel):
    """Paginated time records response."""
    items: list[TimeRecordResponse]
    total: int
    page: int
    size: int
    pages: int
    class Config:
        from_attributes = True
