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

from app.dependencies import require_role_and_active
from app.schemas.moderator import (
    RosterDTO,
    VacationRequestDTO,
    VacationApprovalRequest,
    ShiftAssignmentRequest,
    ShiftDTO,
    VacationSummaryDTO,
    AttendanceReportDTO,
)

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
    current_user: dict = Depends(require_role_and_active("Moderador")),
):
    """
    Get shift roster for moderator's department for a specific month.

    Returns all shifts assigned to employees in the moderator's department
    for the requested year/month, including vacation status indicators.
    """
    # Implementation will be added in Phase 3 (T016)
    pass


@router.get("/shifts")
async def get_shifts_for_date(
    date: str = Query(..., regex=r"^\d{4}-\d{2}-\d{2}$"),
    current_user: dict = Depends(require_role_and_active("Moderador")),
):
    """
    Get shifts assigned for a specific date in moderator's department.

    Returns shift details including employee names, shift types, and
    vacation status for the specified date.
    """
    # Implementation will be added in Phase 3 (T018)
    pass


# ============================================================================
# Vacation Request Endpoints
# ============================================================================


@router.get("/vacations/pending")
async def list_pending_requests(
    status: str = Query(None),
    employee_id: str = Query(None),
    date_from: str = Query(None, regex=r"^\d{4}-\d{2}-\d{2}$"),
    date_to: str = Query(None, regex=r"^\d{4}-\d{2}-\d{2}$"),
    current_user: dict = Depends(require_role_and_active("Moderador")),
):
    """
    List vacation requests from moderator's department.

    Filters by:
    - status: Pendiente, Aprobado, Rechazado, Cancelado
    - employee_id: Specific employee
    - date_from, date_to: Date range for request dates

    Only shows employees in moderator's department.
    """
    # Implementation will be added in Phase 4 (T030)
    pass


@router.get("/vacations/{request_id}")
async def get_vacation_details(
    request_id: str,
    current_user: dict = Depends(require_role_and_active("Moderador")),
):
    """
    Get detailed information about a specific vacation request.

    Includes employee details, requested dates, days count, and
    current vacation balance.
    """
    # Implementation will be added in Phase 4 (T032)
    pass


@router.post("/vacations/{request_id}/approve")
async def approve_vacation(
    request_id: str,
    current_user: dict = Depends(require_role_and_active("Moderador")),
):
    """
    Approve a pending vacation request.

    - Updates status to "Aprobado"
    - Records moderador's user_id as reviewed_by
    - Records current timestamp as reviewed_at
    - Approved vacation immediately blocks shift assignments

    Returns updated request with moderator's identity recorded.
    """
    # Implementation will be added in Phase 4 (T034)
    pass


@router.post("/vacations/{request_id}/reject")
async def reject_vacation(
    request_id: str,
    body: VacationApprovalRequest,
    current_user: dict = Depends(require_role_and_active("Moderador")),
):
    """
    Reject a pending vacation request.

    - Updates status to "Rechazado"
    - Records moderador's user_id as reviewed_by
    - Records current timestamp as reviewed_at
    - Optionally records rejection reason

    Returns updated request with moderator's identity recorded.
    """
    # Implementation will be added in Phase 4 (T036)
    pass


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
