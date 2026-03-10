"""
Feature 006: Moderator Portal API Endpoints

All endpoints in this router are protected with:
- JWT authentication (require valid token)
- Role-based access control (Moderador role only)
- Department scoping (moderators see only their department's data)
- Tenant isolation (queries filtered by tenant_id from JWT)

Endpoints are organized by functionality:
- Shift Roster: View team shifts by month/date
- Vacation Management: Approve/reject vacation requests
- Shift Assignment: Create/modify shift assignments with conflict detection
- Reports: Vacation and attendance summaries
"""

from typing import List
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.dependencies import require_role_and_active, get_session
from app.common.exceptions import ForbiddenError
from app.schemas.moderator import (
    RosterDTO,
    VacationRequestDTO,
    VacationApprovalRequest,
    ShiftAssignmentRequest,
    ShiftDTO,
    VacationSummaryDTO,
    AttendanceReportDTO,
)
from app.services import moderator_service, moderator_shift_service, vacation_service

router = APIRouter(
    prefix="/moderator",
    tags=["moderator"],
    dependencies=[Depends(require_role_and_active("Moderador"))],
)


# ============================================================================
# Shift Roster Endpoints
# ============================================================================


@router.get("/roster", response_model=dict)
async def get_roster(
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_role_and_active("Moderador")),
):
    """
    T016: Get shift roster for moderator's department for a specific month.

    Returns all shifts assigned to employees in the moderator's department
    for the requested year/month, including vacation status indicators.

    Security:
    - Department scoping enforced: Only returns shifts from moderador's department
    - RLS: All queries filtered by department

    Args:
        year: Year (2020-2100)
        month: Month (1-12)

    Returns:
        {
            "year": int,
            "month": int,
            "department": str,
            "shifts": [
                {
                    "id": str,
                    "employee_id": str,
                    "employee_name": str,
                    "date": str (ISO),
                    "shift_type_id": str,
                    "shift_type_name": str,
                    "entry_time": str | null,
                    "exit_time": str | null,
                    "vacation_status": str | null
                }
            ]
        }
    """
    # Get moderator's department
    department = moderator_service.get_moderator_department(current_user, session)

    # Get roster for this month
    shifts = moderator_shift_service.get_department_roster(
        department, year, month, session
    )

    return {
        "year": year,
        "month": month,
        "department": department,
        "shifts": shifts,
    }


@router.get("/shifts")
async def get_shifts_for_date(
    date: str = Query(..., regex=r"^\d{4}-\d{2}-\d{2}$"),
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_role_and_active("Moderador")),
):
    """
    T018: Get shifts assigned for a specific date in moderator's department.

    Returns shift details including employee names, shift types, and
    vacation status for the specified date.

    Security:
    - Department scoping enforced: Only returns shifts from moderador's department

    Args:
        date: Date in YYYY-MM-DD format

    Returns:
        {
            "date": str,
            "shifts": [
                {
                    "id": str,
                    "employee_id": str,
                    "employee_name": str,
                    "shift_type_id": str,
                    "shift_type_name": str,
                    "entry_time": str | null,
                    "exit_time": str | null,
                    "vacation_status": str | null
                }
            ]
        }
    """
    from datetime import datetime

    # Parse date string
    parsed_date = datetime.strptime(date, "%Y-%m-%d").date()

    # Get moderator's department
    department = moderator_service.get_moderator_department(current_user, session)

    # Get shifts for this date
    shifts = moderator_shift_service.get_shifts_for_date(
        department, parsed_date, session
    )

    return {
        "date": date,
        "shifts": shifts,
    }


# ============================================================================
# Vacation Request Endpoints
# ============================================================================


@router.get("/vacations/pending")
async def list_pending_requests(
    status: str = Query(None),
    employee_id: str = Query(None),
    date_from: str = Query(None, regex=r"^\d{4}-\d{2}-\d{2}$"),
    date_to: str = Query(None, regex=r"^\d{4}-\d{2}-\d{2}$"),
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_role_and_active("Moderador")),
):
    """
    T030: List vacation requests from moderator's department.

    Filters by:
    - status: Pendiente, Aprobado, Rechazado, Cancelado
    - employee_id: Specific employee
    - date_from, date_to: Date range for request dates

    Only shows employees in moderator's department.

    Security:
    - Department scoping enforced: Only returns requests from moderador's department

    Returns:
        {
            "requests": [
                {
                    "id": str,
                    "employee_id": str,
                    "employee_name": str,
                    "start_date": str (ISO),
                    "end_date": str (ISO),
                    "requested_days": int,
                    "status": str,
                    "reviewed_by": str | null,
                    "reviewed_at": str | null,
                    "created_at": str (ISO)
                }
            ],
            "count": int
        }
    """
    import uuid

    # Get moderator's department
    department = moderator_service.get_moderator_department(current_user, session)

    # Get pending requests for the department
    requests = vacation_service.get_department_pending_requests(
        tenant_id=uuid.UUID(current_user.get("tenant_id")),
        department=department,
        session=session,
        status_filter=status,
        employee_id=uuid.UUID(employee_id) if employee_id else None,
    )

    return {
        "requests": requests,
        "count": len(requests),
    }


@router.get("/vacations/{request_id}")
async def get_vacation_details(
    request_id: str,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_role_and_active("Moderador")),
):
    """
    T032: Get detailed information about a specific vacation request.

    Includes employee details, requested dates, days count, and
    current vacation balance.

    Security:
    - Department scoping enforced: Only returns request if employee in moderador's dept

    Args:
        request_id: Vacation request ID

    Returns:
        {
            "id": str,
            "employee_id": str,
            "employee": {
                "name": str,
                "department": str,
                "hire_date": str | null
            },
            "start_date": str (ISO),
            "end_date": str (ISO),
            "requested_days": int,
            "status": str,
            "balance": {
                "year": int,
                "total_days": int,
                "used_days": int,
                "remaining_days": int
            },
            "created_at": str (ISO)
        }
    """
    import uuid

    # Get details
    details = vacation_service.get_vacation_request_details(
        request_id=uuid.UUID(request_id),
        tenant_id=uuid.UUID(current_user.get("tenant_id")),
        session=session,
    )

    # Verify employee belongs to moderator's department
    department = moderator_service.get_moderator_department(current_user, session)
    if details["employee"]["department"] != department:
        raise ForbiddenError("No tienes permiso para ver esta solicitud")

    return details


@router.post("/vacations/{request_id}/approve")
async def approve_vacation(
    request_id: str,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_role_and_active("Moderador")),
):
    """
    T034-T035: Approve a pending vacation request.

    - Updates status to "Aprobado"
    - Records moderador's user_id as reviewed_by
    - Records current timestamp as reviewed_at
    - Approved vacation immediately blocks shift assignments

    Security:
    - Department scoping enforced: Only approves if employee in moderador's dept

    Args:
        request_id: Vacation request ID

    Returns:
        {
            "id": str,
            "employee_id": str,
            "employee_name": str,
            "start_date": str (ISO),
            "end_date": str (ISO),
            "requested_days": int,
            "status": "Aprobado",
            "reviewed_by": str (moderador user_id),
            "reviewed_at": str (ISO timestamp),
            "created_at": str (ISO)
        }
    """
    import uuid

    # Verify employee belongs to moderator's department
    details = vacation_service.get_vacation_request_details(
        request_id=uuid.UUID(request_id),
        tenant_id=uuid.UUID(current_user.get("tenant_id")),
        session=session,
    )
    department = moderator_service.get_moderator_department(current_user, session)
    if details["employee"]["department"] != department:
        raise ForbiddenError("No tienes permiso para aprobar esta solicitud")

    # Approve the request
    response = vacation_service.approve_request(
        request_id=uuid.UUID(request_id),
        reviewer_user_id=uuid.UUID(current_user.get("id")),
        tenant_id=uuid.UUID(current_user.get("tenant_id")),
        session=session,
    )

    return response


@router.post("/vacations/{request_id}/reject")
async def reject_vacation(
    request_id: str,
    body: VacationApprovalRequest,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_role_and_active("Moderador")),
):
    """
    T036-T037: Reject a pending vacation request.

    - Updates status to "Rechazado"
    - Records moderador's user_id as reviewed_by
    - Records current timestamp as reviewed_at
    - Optionally records rejection reason

    Security:
    - Department scoping enforced: Only rejects if employee in moderador's dept

    Args:
        request_id: Vacation request ID
        body.reason: Optional rejection reason

    Returns:
        {
            "id": str,
            "employee_id": str,
            "employee_name": str,
            "start_date": str (ISO),
            "end_date": str (ISO),
            "requested_days": int,
            "status": "Rechazado",
            "reviewed_by": str (moderador user_id),
            "reviewed_at": str (ISO timestamp),
            "created_at": str (ISO)
        }
    """
    import uuid

    # Verify employee belongs to moderator's department
    details = vacation_service.get_vacation_request_details(
        request_id=uuid.UUID(request_id),
        tenant_id=uuid.UUID(current_user.get("tenant_id")),
        session=session,
    )
    department = moderator_service.get_moderator_department(current_user, session)
    if details["employee"]["department"] != department:
        raise ForbiddenError("No tienes permiso para rechazar esta solicitud")

    # Reject the request
    response = vacation_service.reject_request(
        request_id=uuid.UUID(request_id),
        reviewer_user_id=uuid.UUID(current_user.get("id")),
        tenant_id=uuid.UUID(current_user.get("tenant_id")),
        session=session,
        reason=body.reason if body else None,
    )

    return response


# ============================================================================
# Shift Assignment Endpoints
# ============================================================================


@router.post("/shifts/assign")
async def assign_shift(
    body: ShiftAssignmentRequest,
    current_user: dict = Depends(require_role_and_active("Moderador")),
):
    """
    Assign a shift to an employee.

    Validates:
    1. Employee is in moderator's department (400: EMPLOYEE_NOT_IN_DEPARTMENT)
    2. Employee has no approved vacation on that date (400: VACATION_CONFLICT)
    3. Employee has no existing shift on that date (400: SHIFT_EXISTS)

    Returns created shift record with assignment details.
    """
    # Implementation will be added in Phase 5 (T052)
    pass


@router.put("/shifts/{shift_id}")
async def update_shift(
    shift_id: str,
    body: ShiftAssignmentRequest,
    current_user: dict = Depends(require_role_and_active("Moderador")),
):
    """
    Replace an existing shift assignment with a new shift type.

    Applies same conflict validation as assign_shift.

    Returns updated shift record.
    """
    # Implementation will be added in Phase 5 (T054)
    pass


@router.delete("/shifts/{shift_id}")
async def delete_shift(
    shift_id: str,
    current_user: dict = Depends(require_role_and_active("Moderador")),
):
    """
    Delete a shift assignment.

    Can only delete shifts that have not been worked yet (entry_time not set).
    Returns 400: SHIFT_WORKED if shift has been clocked in.

    Returns 204 No Content on success.
    """
    # Implementation will be added in Phase 5 (T056)
    pass


# ============================================================================
# Reports Endpoints
# ============================================================================


@router.get("/reports/vacations", response_model=VacationSummaryDTO)
async def get_vacation_summary(
    year: int = Query(..., ge=2020, le=2100),
    status: str = Query(None),
    current_user: dict = Depends(require_role_and_active("Moderador")),
):
    """
    Get vacation summary for moderator's department.

    Returns aggregated data by employee showing:
    - approved_days: Count of days in approved requests
    - rejected_days: Count of days in rejected requests
    - pending_days: Count of days in pending requests
    - remaining_days: Current vacation balance

    Filtered to moderator's department only.
    """
    # Implementation will be added in Phase 6 (T072)
    pass


@router.get("/reports/attendance", response_model=AttendanceReportDTO)
async def get_attendance_report(
    date_from: str = Query(..., regex=r"^\d{4}-\d{2}-\d{2}$"),
    date_to: str = Query(..., regex=r"^\d{4}-\d{2}-\d{2}$"),
    current_user: dict = Depends(require_role_and_active("Moderador")),
):
    """
    Get attendance report for moderator's department.

    Returns clock in/out records aggregated by employee and date,
    showing hours worked and shift type for the requested date range.

    Filtered to moderator's department only.
    """
    # Implementation will be added in Phase 6 (T074)
    pass
