"""Dashboard Pydantic DTOs for Feature 005.

Schemas for employee dashboard overview and related data.
"""

import uuid
from datetime import datetime, date
from pydantic import BaseModel


class EmployeeInfoResponse(BaseModel):
    """Basic employee information for dashboard."""
    id: uuid.UUID
    name: str  # Computed from first_name + last_name
    email: str
    role: str


class TodayShiftResponse(BaseModel):
    """Today's shift information."""
    date: date
    has_shift: bool
    shift_type: str | None
    entry_time: str | None  # HH:MM format
    exit_time: str | None  # HH:MM format
    clock_status: str | None  # "clocked-in", "clocked-out", null
    clock_in_time: str | None  # HH:MM:SS format
    elapsed_time_formatted: str | None  # "1h 30m" format


class VacationBalanceResponse(BaseModel):
    """Vacation balance for current year."""
    year: int
    total_days: int
    used_days: int
    remaining_days: int


class UpcomingEventResponse(BaseModel):
    """Upcoming shift or vacation event."""
    type: str  # "shift" or "vacation"
    date: date | None  # For shifts
    date_from: date | None  # For vacations
    date_to: date | None  # For vacations
    shift_type: str | None
    entry_time: str | None
    exit_time: str | None
    status: str | None  # For vacations: "Pendiente", "Aprobado", etc


class DashboardResponse(BaseModel):
    """Complete dashboard overview."""
    employee: EmployeeInfoResponse
    today: TodayShiftResponse
    vacation_balance: VacationBalanceResponse
    upcoming_events: list[UpcomingEventResponse]
    class Config:
        from_attributes = True


class ShiftListResponse(BaseModel):
    """List of employee shifts."""
    id: uuid.UUID
    date: date
    shift_type: str
    shift_type_id: uuid.UUID
    entry_time: str | None
    exit_time: str | None
    status: str
    task_label: str | None
    vacation_overlap: bool
    vacation_status: str | None  # Status if overlapping with vacation


class ShiftsResponse(BaseModel):
    """Paginated shifts response."""
    items: list[ShiftListResponse]
    total: int
    date_from: date
    date_to: date
