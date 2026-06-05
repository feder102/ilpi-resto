"""Time Tracking Pydantic DTOs for Feature 008 & 010.

Schemas for:
- Feature 008: Automatic time entry tracking and work statistics (automatic shift-based tracking)
- Feature 010: Admin-driven shift hours + extra hours (overtime). Manual employee
  clock-in/out has been removed; worked hours derive from assigned shifts.
"""

import uuid
from datetime import date, datetime, time
from decimal import Decimal
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field

# ========== Feature 008: Automatic Time Tracking Schemas ==========

class TimeEntrySource(str, Enum):
    """Source of time entry."""
    SHIFT = "shift"
    MANUAL = "manual"
    EXTRA = "extra"


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


class ExtraHoursCreate(BaseModel):
    """Request to register extra hours (overtime) for an employee.

    Admin/Moderador only. Recorded as a separate category (source="extra").
    """
    employee_id: uuid.UUID
    work_date: date
    hours: Decimal = Field(gt=0, le=24, description="Extra hours (> 0 and <= 24)")
    note: Optional[str] = Field(default=None, max_length=255, description="Reason for the extra hours")


# Response Schemas

class TimeEntryResponse(BaseModel):
    """Single time entry response."""
    id: uuid.UUID
    employee_id: uuid.UUID
    employee_name: str
    employee_dni: str
    shift_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    hours_worked: Decimal
    source: TimeEntrySource
    note: Optional[str] = None
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
    """Statistics for a single employee.

    `total_hours` includes both shift hours and extra hours.
    `extra_hours` is the overtime portion, reported separately.
    """
    employee_id: uuid.UUID
    period: str  # "2026-03"
    total_hours: Decimal
    extra_hours: Decimal = Decimal(0)
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


# ========== Feature 005: Employee Portal Statistics ==========

class DailyRecordResponse(BaseModel):
    """Daily work record for employee statistics."""
    date: str  # YYYY-MM-DD
    entry_time: Optional[str] = None  # HH:MM or null
    exit_time: Optional[str] = None  # HH:MM or null
    duration_hours: str | float  # "8.5" or 8.5
    is_extra: bool = False  # True if this is an extra-hours (overtime) entry
    note: Optional[str] = None  # Reason, for extra-hours entries


class WeeklyBreakdownResponse(BaseModel):
    """Weekly hours breakdown for employee statistics.

    Uses ISO 8601 week numbering (week 1-53 per year).
    Week 1 is the first week with Thursday of the year.
    """
    week: int  # ISO week number (1-53)
    hours: str | float  # Total hours in that week


class EmployeeStatisticsPublicResponse(BaseModel):
    """Statistics response for current logged-in employee.

    `total_hours` includes shift hours + extra hours; `extra_hours` is the
    overtime portion reported separately.
    """
    total_hours: str | float  # Total hours for the month (shift + extra)
    extra_hours: str | float = 0  # Extra (overtime) hours portion
    weekly_breakdown: List[WeeklyBreakdownResponse]  # Breakdown by week
    daily_records: List[DailyRecordResponse]  # Daily records with times
