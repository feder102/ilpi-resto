"""
Feature 006: Moderator Portal Request/Response DTOs

Pydantic v2 schemas for moderator endpoints.
All schemas follow strict type safety with no Optional fields unless explicitly nullable.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


# ============================================================================
# Shift Roster DTOs
# ============================================================================


class RosterDayDTO(BaseModel):
    """Single shift record in roster view"""

    id: str = Field(..., description="Shift record ID")
    employee_id: str = Field(..., description="Employee ID")
    employee_name: str = Field(..., description="Employee full name")
    date: str = Field(..., description="Shift date (YYYY-MM-DD)")
    shift_type_id: str = Field(..., description="Shift type ID")
    shift_type_name: str = Field(..., description="Shift type name (Mañana, Noche, etc.)")
    entry_time: Optional[str] = Field(
        None, description="Clock-in time (HH:MM) or null for roster-only shifts"
    )
    exit_time: Optional[str] = Field(
        None, description="Clock-out time (HH:MM) or null for roster-only shifts"
    )
    vacation_status: Optional[str] = Field(
        None, description="If employee has approved vacation: 'Aprobado', else null"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "id": "shift-123",
                "employee_id": "emp-456",
                "employee_name": "Carlos Rodríguez",
                "date": "2026-03-15",
                "shift_type_id": "st-789",
                "shift_type_name": "Mañana",
                "entry_time": None,
                "exit_time": None,
                "vacation_status": None,
            }
        }


class RosterDTO(BaseModel):
    """Response for GET /moderator/roster"""

    year: int = Field(..., ge=2020, le=2100)
    month: int = Field(..., ge=1, le=12)
    department: str = Field(..., description="Moderator's department")
    shifts: List[RosterDayDTO] = Field(default_factory=list)

    class Config:
        json_schema_extra = {
            "example": {
                "year": 2026,
                "month": 3,
                "department": "Cocina",
                "shifts": [
                    {
                        "id": "shift-123",
                        "employee_id": "emp-456",
                        "employee_name": "Carlos Rodríguez",
                        "date": "2026-03-15",
                        "shift_type_id": "st-789",
                        "shift_type_name": "Mañana",
                        "entry_time": None,
                        "exit_time": None,
                        "vacation_status": None,
                    }
                ],
            }
        }


# ============================================================================
# Vacation Request DTOs
# ============================================================================


class VacationRequestDTO(BaseModel):
    """Vacation request details for moderator review"""

    id: str = Field(..., description="Vacation request ID")
    employee_id: str = Field(..., description="Employee ID")
    employee_name: str = Field(..., description="Employee full name")
    department: str = Field(..., description="Employee department")
    start_date: str = Field(..., description="Start date (YYYY-MM-DD)")
    end_date: str = Field(..., description="End date (YYYY-MM-DD)")
    requested_days: int = Field(..., description="Number of calendar days requested")
    status: str = Field(
        ..., description="Status: Pendiente, Aprobado, Rechazado, Cancelado"
    )
    created_at: datetime = Field(..., description="Request creation timestamp")
    reviewed_by: Optional[str] = Field(
        None, description="User ID of moderator who approved/rejected"
    )
    reviewed_at: Optional[datetime] = Field(
        None, description="Timestamp when request was reviewed"
    )
    rejection_reason: Optional[str] = Field(None, description="Reason for rejection")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "vr-123",
                "employee_id": "emp-456",
                "employee_name": "Carlos Rodríguez",
                "department": "Cocina",
                "start_date": "2026-03-15",
                "end_date": "2026-03-17",
                "requested_days": 3,
                "status": "Pendiente",
                "created_at": "2026-03-09T10:30:00Z",
                "reviewed_by": None,
                "reviewed_at": None,
                "rejection_reason": None,
            }
        }


class VacationApprovalRequest(BaseModel):
    """Request body for approve/reject vacation endpoints"""

    reason: Optional[str] = Field(
        None,
        max_length=500,
        description="Optional reason for rejection (for reject endpoint only)",
    )

    class Config:
        json_schema_extra = {"example": {"reason": "Necesitamos cobertura esa semana"}}


class VacationBalanceDTO(BaseModel):
    """Employee vacation balance information"""

    year: int = Field(..., description="Vacation year")
    total_days: int = Field(..., description="Total vacation days for the year")
    used_days: int = Field(..., description="Days already used (approved vacations)")
    remaining_days: int = Field(..., description="Days remaining (total - used)")

    class Config:
        json_schema_extra = {
            "example": {"year": 2026, "total_days": 30, "used_days": 5, "remaining_days": 25}
        }


class VacationDetailDTO(BaseModel):
    """Detailed vacation request with employee info and balance"""

    id: str
    employee_id: str
    employee: dict = Field(..., description="Employee details")
    start_date: str
    end_date: str
    requested_days: int
    status: str
    balance: VacationBalanceDTO
    created_at: datetime


# ============================================================================
# Shift Assignment DTOs
# ============================================================================


class ShiftAssignmentRequest(BaseModel):
    """Request body for POST /shifts/assign and PUT /shifts/{id}"""

    employee_id: str = Field(..., description="Employee ID to assign shift to")
    date: str = Field(..., description="Shift date (YYYY-MM-DD)", regex=r"^\d{4}-\d{2}-\d{2}$")
    shift_type_id: str = Field(..., description="Shift type ID to assign")

    class Config:
        json_schema_extra = {
            "example": {
                "employee_id": "emp-456",
                "date": "2026-03-15",
                "shift_type_id": "st-789",
            }
        }


class ShiftDTO(BaseModel):
    """Shift record response"""

    id: str
    employee_id: str
    employee_name: str
    date: str
    shift_type_name: str
    entry_time: Optional[str] = None
    exit_time: Optional[str] = None
    message: str = Field(default="", description="Status message for user")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "shift-123",
                "employee_id": "emp-456",
                "employee_name": "Carlos Rodríguez",
                "date": "2026-03-15",
                "shift_type_name": "Mañana",
                "entry_time": None,
                "exit_time": None,
                "message": "Turno asignado exitosamente",
            }
        }


# ============================================================================
# Report DTOs
# ============================================================================


class VacationSummaryRowDTO(BaseModel):
    """Single row in vacation summary (per employee)"""

    employee_id: str
    employee_name: str
    approved_days: int = Field(..., description="Days in approved requests")
    rejected_days: int = Field(..., description="Days in rejected requests")
    pending_days: int = Field(..., description="Days in pending requests")
    remaining_days: int = Field(..., description="Current vacation balance")


class DepartmentTotalDTO(BaseModel):
    """Department-wide totals for vacation summary"""

    approved_days: int
    rejected_days: int
    pending_days: int


class VacationSummaryDTO(BaseModel):
    """Response for GET /moderator/reports/vacations"""

    year: int
    department: str
    summary: List[VacationSummaryRowDTO]
    department_total: DepartmentTotalDTO

    class Config:
        json_schema_extra = {
            "example": {
                "year": 2026,
                "department": "Cocina",
                "summary": [
                    {
                        "employee_id": "emp-456",
                        "employee_name": "Carlos Rodríguez",
                        "approved_days": 10,
                        "rejected_days": 2,
                        "pending_days": 0,
                        "remaining_days": 20,
                    }
                ],
                "department_total": {"approved_days": 35, "rejected_days": 5, "pending_days": 3},
            }
        }


class AttendanceRecordDTO(BaseModel):
    """Single attendance record"""

    employee_id: str
    employee_name: str
    date: str = Field(..., description="Date (YYYY-MM-DD)")
    clock_in: Optional[str] = Field(..., description="Clock-in time (HH:MM)")
    clock_out: Optional[str] = Field(..., description="Clock-out time (HH:MM)")
    hours_worked: Optional[float] = Field(..., description="Hours worked (decimal)")
    shift_type: str = Field(..., description="Shift type name")


class AttendanceReportDTO(BaseModel):
    """Response for GET /moderator/reports/attendance"""

    date_from: str
    date_to: str
    department: str
    records: List[AttendanceRecordDTO]

    class Config:
        json_schema_extra = {
            "example": {
                "date_from": "2026-03-01",
                "date_to": "2026-03-31",
                "department": "Cocina",
                "records": [
                    {
                        "employee_id": "emp-456",
                        "employee_name": "Carlos Rodríguez",
                        "date": "2026-03-10",
                        "clock_in": "10:32",
                        "clock_out": "18:05",
                        "hours_worked": 7.55,
                        "shift_type": "Mañana",
                    }
                ],
            }
        }
