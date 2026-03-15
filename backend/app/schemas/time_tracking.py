"""Time Tracking Pydantic DTOs for Features 005 & 008.

Schemas for:
- Feature 005: Clock-in/out operations and time record management (manual tracking - Phase 2)
- Feature 008: Automatic time entry tracking and work statistics (automatic shift-based tracking - Phase 1)
"""

import uuid
from datetime import datetime, date, time
from decimal import Decimal
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field


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
    summary: dict[str, Any]  # {total_hours, total_minutes, formatted, clock_in, clock_out}
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


# ========== Feature 008: Automatic Time Tracking Schemas ==========

class TimeEntrySource(str, Enum):
    """Source of time entry."""
    SHIFT = "shift"
    MANUAL = "manual"


# Request Schemas

class TimeEntryFilterRequest(BaseModel):
    """Filter parameters for time entry queries."""
    start_date: date
    end_date: date
    employee_id: Optional[uuid.UUID] = None
    department: Optional[str] = None
    source: Optional[TimeEntrySource] = TimeEntrySource.SHIFT
    limit: int = Field(default=100, le=1000, ge=1)
    offset: int = Field(default=0, ge=0)


class StatisticsFilterRequest(BaseModel):
    """Filter parameters for statistics queries."""
    year: int = Field(ge=2020, le=2100)
    month: int = Field(ge=1, le=12)
    include_manual: bool = False


class BatchProcessRequest(BaseModel):
    """Request to manually trigger batch processing."""
    process_date: date
    overwrite_existing: bool = False


# Response Schemas

class TimeEntryResponse(BaseModel):
    """Single time entry response."""
    id: uuid.UUID
    employee_id: uuid.UUID
    employee_name: str
    employee_dni: str
    shift_date: date
    start_time: time
    end_time: time
    hours_worked: Decimal
    source: TimeEntrySource
    shift_type_id: Optional[uuid.UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TimeEntryListResponse(BaseModel):
    """Paginated list of time entries."""
    total: int
    limit: int
    offset: int
    items: List[TimeEntryResponse]


class EmployeeStatisticsResponse(BaseModel):
    """Statistics for a single employee."""
    employee_id: uuid.UUID
    period: str  # "2026-03"
    total_hours: Decimal
    days_worked: int
    avg_hours_per_day: Decimal
    breakdown_by_shift_type: Dict[str, Decimal]


class DepartmentStatisticsResponse(BaseModel):
    """Statistics aggregated by department."""
    department: str
    period: str
    total_hours: Decimal
    unique_employees: int
    avg_hours_per_employee: Decimal


class BatchProcessResponse(BaseModel):
    """Response from batch processing trigger."""
    job_id: str
    status: str  # "queued", "processing", "completed", "failed"
    message: str
    estimated_entries: Optional[int] = None
    completed_at: Optional[datetime] = None
