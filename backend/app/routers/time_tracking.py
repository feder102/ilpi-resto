"""Time Tracking Router for Features 005 & 008.

Feature 005: Clock-in/out and time record retrieval (Empleado access)
Feature 008: Automatic shift-based tracking & statistics (Admin/Moderador access)
"""

from typing import Optional, Annotated
from datetime import date as date_type

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlmodel import Session

from app.common.exceptions import handle_exceptions
from app.dependencies import DbSession, require_role_and_active
from app.services import time_tracking_service
from app.schemas.time_tracking import ClockInResponse, ClockOutResponse, TimeRecordListResponse

router = APIRouter(prefix="/employee/time-tracking", tags=["time-tracking"])


@router.post("/clock-in", response_model=ClockInResponse, status_code=201)
@handle_exceptions
def clock_in(
    session: DbSession,
    current_user: dict = Depends(require_role_and_active("Empleado"))
):
    """Clock in employee for their shift.

    Requires:
    - Employee has shift scheduled for today
    - Employee is not already clocked in
    - Valid JWT token with Empleado role

    Returns:
    - 201: Created - Time record created successfully
    - 400: Bad Request - No shift today, already clocked in, future timestamp
    - 403: Forbidden - User is not authorized to clock in for this employee
    """
    import uuid
    employee_id = uuid.UUID(current_user.get("employee_id", ""))
    tenant_id = uuid.UUID(current_user.get("tenant_id", ""))

    return time_tracking_service.clock_in(
        employee_id=employee_id,
        tenant_id=tenant_id,
        current_user=current_user,
        session=session
    )


@router.post("/clock-out", response_model=ClockOutResponse, status_code=200)
@handle_exceptions
def clock_out(
    session: DbSession,
    current_user: dict = Depends(require_role_and_active("Empleado"))
):
    """Clock out employee from their shift.

    Requires:
    - Employee is currently clocked in
    - Valid JWT token with Empleado role

    Returns:
    - 200: OK - Time record updated successfully with summary
    - 400: Bad Request - Not clocked in, future timestamp
    - 403: Forbidden - User is not authorized to clock out for this employee
    """
    import uuid
    employee_id = uuid.UUID(current_user.get("employee_id", ""))
    tenant_id = uuid.UUID(current_user.get("tenant_id", ""))

    return time_tracking_service.clock_out(
        employee_id=employee_id,
        tenant_id=tenant_id,
        current_user=current_user,
        session=session
    )


@router.get("/today", status_code=200)
@handle_exceptions
def get_today_status(
    session: DbSession,
    current_user: dict = Depends(require_role_and_active("Empleado")),
):
    """Get current clock-in/out status for today.

    Used by dashboard widget to show if employee is clocked in, clocked out, or has no record.

    Returns:
    - 200: OK - Status object with record (if exists) and elapsed time (if clocked in)
    - 401: Unauthorized - Not authenticated or is_active=false
    - 403: Forbidden - Not Empleado role
    """
    import uuid
    employee_id = uuid.UUID(current_user.get("employee_id", ""))
    tenant_id = uuid.UUID(current_user.get("tenant_id", ""))

    return time_tracking_service.get_today_status(
        employee_id=employee_id,
        tenant_id=tenant_id,
        current_user=current_user,
        session=session
    )


@router.get("/records", response_model=TimeRecordListResponse, status_code=200)
@handle_exceptions
def get_time_records(
    session: DbSession,
    current_user: dict = Depends(require_role_and_active("Empleado")),
    date_from: Optional[date_type] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[date_type] = Query(None, description="End date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    size: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
):
    """Get employee's time records for a date range.

    Requires:
    - Valid JWT token with Empleado role

    Query Parameters:
    - date_from: Start date (optional, default: 30 days ago)
    - date_to: End date (optional, default: today)
    - page: Page number (default: 1)
    - size: Items per page (default: 20, max: 100)

    Returns:
    - 200: OK - List of time records
    - 400: Bad Request - Invalid date range
    - 403: Forbidden - User is not authorized to see these records
    """
    import uuid
    employee_id = uuid.UUID(current_user.get("employee_id", ""))
    tenant_id = uuid.UUID(current_user.get("tenant_id", ""))

    return time_tracking_service.get_time_records(
        employee_id=employee_id,
        tenant_id=tenant_id,
        current_user=current_user,
        date_from=date_from,
        date_to=date_to,
        page=page,
        size=size,
        session=session
    )


# ========== Feature 008: Automatic Time Tracking Endpoints ==========
# These endpoints provide statistics and reporting for automatic shift-based time tracking
# Access: Admin and Moderador only

from app.dependencies import get_current_user, CurrentUser, get_db
from app.services.time_tracking_service import TimeTrackingService
from app.schemas.time_tracking import (
    StatisticsFilterRequest,
    TimeEntryFilterRequest,
    BatchProcessRequest,
    BatchProcessResponse,
    EmployeeStatisticsResponse,
    DepartmentStatisticsResponse,
    TimeEntryListResponse,
)


def require_admin_or_moderator(current_user: CurrentUser):
    """Dependency: Require Admin or Moderator role."""
    if current_user.get("role") not in ["Admin", "Moderador"]:
        raise HTTPException(status_code=403, detail="Not authorized to view statistics")
    return current_user


def require_admin(current_user: CurrentUser):
    """Dependency: Require Admin role only."""
    if current_user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return current_user


@router.get(
    "/statistics/employee/{employee_id}",
    response_model=EmployeeStatisticsResponse,
    summary="Get employee monthly statistics",
)
def get_employee_statistics(
    employee_id: str,
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    include_manual: bool = Query(False),
    current_user: dict = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
):
    """Get monthly work statistics for a specific employee."""
    import uuid
    import logging
    logger = logging.getLogger(__name__)
    try:
        stats = TimeTrackingService.get_employee_statistics(
            db=db,
            tenant_id=uuid.UUID(current_user.get("tenant_id", "")),
            employee_id=uuid.UUID(employee_id),
            year=year,
            month=month,
            include_manual=include_manual,
        )
        return stats
    except Exception as e:
        logger.error(f"Statistics calculation error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Statistics calculation failed: {str(e)}")


@router.get(
    "/statistics/department",
    response_model=DepartmentStatisticsResponse,
    summary="Get department statistics",
)
def get_department_statistics(
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    department: Optional[str] = Query(None),
    include_manual: bool = Query(False),
    current_user: dict = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
):
    """Get monthly work statistics aggregated by department."""
    import uuid
    import logging
    logger = logging.getLogger(__name__)
    try:
        stats = TimeTrackingService.get_department_statistics(
            db=db,
            tenant_id=uuid.UUID(current_user.get("tenant_id", "")),
            year=year,
            month=month,
            department=department,
            include_manual=include_manual,
        )
        return stats
    except Exception as e:
        logger.error(f"Department statistics error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Statistics calculation failed: {str(e)}")


@router.get(
    "/entries",
    response_model=TimeEntryListResponse,
    summary="Get time entries with pagination",
)
def get_time_entries(
    start_date: date_type = Query(...),
    end_date: date_type = Query(...),
    employee_id: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    source: str = Query("shift", regex="^(shift|manual)$"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
):
    """Get detailed time entries with optional filtering."""
    import uuid
    import logging
    logger = logging.getLogger(__name__)
    try:
        emp_id = uuid.UUID(employee_id) if employee_id else None
        entries = TimeTrackingService.get_time_entries(
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
        return entries
    except Exception as e:
        logger.error(f"Failed to get entries: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get entries: {str(e)}")


@router.post(
    "/batch-process",
    response_model=BatchProcessResponse,
    status_code=202,
    summary="Trigger manual batch processing",
)
def trigger_batch_process(
    request: BatchProcessRequest,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Manually trigger automatic time entry generation for a specific date."""
    import uuid
    try:
        entries_created = TimeTrackingService.generate_time_entries_for_date(
            db=db,
            tenant_id=uuid.UUID(current_user.get("tenant_id", "")),
            target_date=request.process_date,
        )

        return BatchProcessResponse(
            job_id=f"batch-{request.process_date.isoformat()}",
            status="completed",
            message=f"Successfully created {entries_created} time entries",
            estimated_entries=entries_created,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Batch processing failed")
