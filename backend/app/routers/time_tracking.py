"""Time Tracking Router for Feature 005: Employee Workspace Portal.

Endpoints for clock-in/out and time record retrieval.
All endpoints require Empleado role authentication.
"""

from typing import Optional
from datetime import date as date_type

from fastapi import APIRouter, Depends, Query
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
    employee_id = uuid.UUID(current_user.get("emp_id", ""))
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
    employee_id = uuid.UUID(current_user.get("emp_id", ""))
    tenant_id = uuid.UUID(current_user.get("tenant_id", ""))

    return time_tracking_service.clock_out(
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
    employee_id = uuid.UUID(current_user.get("emp_id", ""))
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
