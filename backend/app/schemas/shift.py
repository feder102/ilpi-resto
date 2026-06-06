"""T063: Shift Pydantic DTOs.

Updated for Feature 004: Shift Roster Calendar
- Added ShiftCreate, ShiftUpdate for roster management
- Added ShiftResponse for roster calendar view
"""

import uuid
from datetime import date as date_type

from pydantic import BaseModel, Field


class ShiftRecordResponse(BaseModel):
    id: uuid.UUID
    employee_id: uuid.UUID
    employee_name: str | None = None
    employee_image: str | None = None
    date: date_type
    entry_time: str | None
    exit_time: str | None
    location_lat: float | None
    location_lng: float | None
    task_label: str | None


# ============================================================================
# NEW SCHEMAS FOR SHIFT ROSTER CALENDAR (Feature 004)
# ============================================================================


class ShiftCreate(BaseModel):
    """Request to create a shift assignment for roster planning."""

    employee_id: uuid.UUID = Field(..., description="UUID of employee")
    date: date_type = Field(..., description="Date of shift (YYYY-MM-DD)")
    shift_type_id: uuid.UUID = Field(..., description="UUID of shift type")


class ShiftUpdate(BaseModel):
    """Request to update a shift assignment."""

    shift_type_id: uuid.UUID = Field(..., description="UUID of new shift type")


class ShiftResponse(BaseModel):
    """Response for shift assignment in roster calendar."""

    id: uuid.UUID
    employee_id: uuid.UUID
    employee_name: str | None = None
    date: date_type
    shift_type_id: uuid.UUID
    shift_type_name: str | None = None  # Name of the shift type (Mañana, Noche, etc)
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
