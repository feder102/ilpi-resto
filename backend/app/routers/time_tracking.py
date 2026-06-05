"""Time Tracking Router for Features 008 & 010.

Feature 008: Automatic shift-based tracking & statistics (Admin/Moderador access)
Feature 010: Employee read-only monthly hours + Admin/Moderador extra hours.
Manual employee clock-in/out has been removed.
"""

import uuid
from datetime import date as date_type
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.common.exceptions import ForbiddenError, ValidationError, handle_exceptions
from app.common.time_tracking_exceptions import NoShiftsFoundError
from app.dependencies import CurrentUser, DbSession, get_db, require_role_and_active
from app.schemas.time_tracking import (
    BatchProcessRequest,
    BatchProcessResponse,
    DepartmentStatisticsResponse,
    EmployeeStatisticsPublicResponse,
    EmployeeStatisticsResponse,
    ExtraHoursCreate,
    TimeEntryListResponse,
    TimeEntryResponse,
)
from app.services.time_tracking_service import TimeTrackingService

router = APIRouter(prefix="/employee/time-tracking", tags=["time-tracking"])


@router.get("/statistics", response_model=EmployeeStatisticsPublicResponse, status_code=200)
@handle_exceptions
def get_employee_statistics_public(
    db: DbSession,
    year: int = Query(..., ge=2020, le=2100, description="Year (YYYY)"),
    month: int = Query(..., ge=1, le=12, description="Month (1-12)"),
    current_user: dict = Depends(require_role_and_active("Empleado")),
):
    """Get work statistics for the logged-in employee.

    Returns total hours worked, weekly breakdown, and daily records with entry/exit times.
    This endpoint is for the employee portal dashboard.

    Requires:
    - Valid JWT token with Empleado role
    - is_active=true

    Query Parameters:
    - year: Year (1-indexed, e.g., 2026)
    - month: Month (1-12, e.g., 3 for March)

    Returns:
    - 200: OK - Statistics object with total_hours, weekly_breakdown, daily_records
    - 400: Bad Request - Invalid year/month
    - 401: Unauthorized - Not authenticated or is_active=false
    - 403: Forbidden - Not Empleado role
    - 404: Not Found - Employee not found
    """
    employee_id = uuid.UUID(current_user.get("employee_id", ""))
    tenant_id = uuid.UUID(current_user.get("tenant_id", ""))

    return TimeTrackingService.get_employee_statistics_for_current_user(
        db=db,
        tenant_id=tenant_id,
        employee_id=employee_id,
        year=year,
        month=month,
    )


# ========== Feature 008: Automatic Time Tracking Endpoints ==========
# These endpoints provide statistics and reporting for automatic shift-based time tracking
# Access: Admin and Moderador only


def require_admin_or_moderator(current_user: CurrentUser) -> dict:
    """Dependency: Require Admin or Moderator role."""
    if current_user.get("role") not in ["Admin", "Moderador"]:
        raise ForbiddenError("No autorizado para ver estadísticas")
    return current_user


def require_admin(current_user: CurrentUser) -> dict:
    """Dependency: Require Admin role only."""
    if current_user.get("role") != "Admin":
        raise ForbiddenError("Solo administradores pueden realizar esta acción")
    return current_user


def _parse_employee_uuid(employee_id: str) -> uuid.UUID:
    """Parse and validate employee_id as UUID."""
    try:
        return uuid.UUID(employee_id)
    except ValueError:
        raise ValidationError(f"Formato de ID de empleado inválido: {employee_id}")


@router.post(
    "/extra-hours",
    response_model=TimeEntryResponse,
    status_code=201,
    summary="Register extra hours for an employee",
)
@handle_exceptions
def create_extra_hours(
    body: ExtraHoursCreate,
    current_user: dict = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
) -> TimeEntryResponse:
    """Register extra (overtime) hours for an employee as a separate category.

    Admin/Moderador only. Stored with source="extra" (no schedule).

    Returns:
    - 201: Created - Extra-hours entry created
    - 400: Bad Request - hours out of range (must be > 0 and <= 24)
    - 403: Forbidden - Caller is not Admin/Moderador
    - 404: Not Found - Employee not found in tenant
    """
    return TimeTrackingService.create_extra_hours(
        db=db,
        tenant_id=uuid.UUID(current_user.get("tenant_id", "")),
        current_user=current_user,
        employee_id=body.employee_id,
        work_date=body.work_date,
        hours=body.hours,
        note=body.note,
    )


@router.delete(
    "/extra-hours/{entry_id}",
    status_code=204,
    summary="Delete an extra-hours entry",
)
@handle_exceptions
def delete_extra_hours(
    entry_id: uuid.UUID,
    current_user: dict = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
) -> None:
    """Delete an extra-hours entry (Admin/Moderador only).

    Only entries with source="extra" can be deleted.

    Returns:
    - 204: No Content - Deleted
    - 403: Forbidden - Caller is not Admin/Moderador
    - 404: Not Found - Extra-hours entry not found
    """
    TimeTrackingService.delete_extra_hours(
        db=db,
        tenant_id=uuid.UUID(current_user.get("tenant_id", "")),
        current_user=current_user,
        entry_id=entry_id,
    )


@router.get(
    "/statistics/employee/{employee_id}",
    response_model=EmployeeStatisticsResponse,
    summary="Get employee monthly statistics",
)
@handle_exceptions
def get_employee_statistics(
    employee_id: str,
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    include_manual: bool = Query(False),
    current_user: dict = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
) -> EmployeeStatisticsResponse:
    """Get monthly work statistics for a specific employee."""
    emp_uuid = _parse_employee_uuid(employee_id)

    return TimeTrackingService.get_employee_statistics(
        db=db,
        tenant_id=uuid.UUID(current_user.get("tenant_id", "")),
        employee_id=emp_uuid,
        year=year,
        month=month,
        include_manual=include_manual,
    )


@router.get(
    "/statistics/department",
    response_model=DepartmentStatisticsResponse,
    summary="Get department statistics",
)
@handle_exceptions
def get_department_statistics(
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    department: Optional[str] = Query(None),
    include_manual: bool = Query(False),
    current_user: dict = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
) -> DepartmentStatisticsResponse:
    """Get monthly work statistics aggregated by department."""
    return TimeTrackingService.get_department_statistics(
        db=db,
        tenant_id=uuid.UUID(current_user.get("tenant_id", "")),
        year=year,
        month=month,
        department=department,
        include_manual=include_manual,
    )


@router.get(
    "/entries",
    response_model=TimeEntryListResponse,
    summary="Get time entries with pagination",
)
@handle_exceptions
def get_time_entries(
    start_date: date_type = Query(...),
    end_date: date_type = Query(...),
    employee_id: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    source: str = Query("shift", regex="^(shift|manual|extra)$"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
) -> TimeEntryListResponse:
    """Get detailed time entries with optional filtering."""
    emp_id = _parse_employee_uuid(employee_id) if employee_id else None

    return TimeTrackingService.get_time_entries(
        db=db,
        tenant_id=uuid.UUID(current_user.get("tenant_id", "")),
        start_date=start_date,
        end_date=end_date,
        employee_id=emp_id,
        department=department,
        source=source,
        limit=limit,
        offset=offset,
    )


@router.post(
    "/batch-process",
    response_model=BatchProcessResponse,
    status_code=202,
    summary="Trigger manual batch processing",
)
@handle_exceptions
def trigger_batch_process(
    request: BatchProcessRequest,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db),
) -> BatchProcessResponse:
    """Manually trigger automatic time entry generation for a specific date."""
    try:
        entries_created = TimeTrackingService.generate_time_entries_for_date(
            db=db,
            tenant_id=uuid.UUID(current_user.get("tenant_id", "")),
            target_date=request.process_date,
        )

        return BatchProcessResponse(
            job_id=f"batch-{request.process_date.isoformat()}",
            status="completed",
            message=f"Se crearon exitosamente {entries_created} entradas de tiempo",
            estimated_entries=entries_created,
        )
    except NoShiftsFoundError:
        return BatchProcessResponse(
            job_id=f"batch-{request.process_date.isoformat()}",
            status="completed",
            message=f"No se encontraron turnos para {request.process_date}",
            estimated_entries=0,
        )
