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


# ============================================================================
# BULK SHIFT LOADING (Feature 011: Carga masiva de turnos)
# ============================================================================


class BulkShiftCreate(BaseModel):
    """Request to bulk-assign a shift type to several employees over a date range."""

    employee_ids: list[uuid.UUID] = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Empleados a los que asignar el turno (máx. 100)",
    )
    shift_type_id: uuid.UUID = Field(..., description="UUID del tipo de turno")
    start_date: date_type = Field(..., description="Primer día del rango (YYYY-MM-DD)")
    end_date: date_type = Field(..., description="Último día del rango (YYYY-MM-DD)")
    include_weekends: bool = Field(
        default=True,
        description="True = todos los días; False = solo días laborales (Lun-Vie)",
    )


class BulkShiftSkipped(BaseModel):
    """A single (employee, date) combination that was skipped during bulk loading."""

    employee_id: uuid.UUID
    employee_name: str | None = None
    date: date_type
    reason: str  # Motivo de la omisión (turno existente, vacaciones, fecha pasada, ...)


class BulkShiftResult(BaseModel):
    """Summary of a bulk shift loading operation."""

    created: list[ShiftResponse]
    skipped: list[BulkShiftSkipped]
    created_count: int
    skipped_count: int
