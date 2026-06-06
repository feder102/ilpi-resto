"""T068: Shifts router.

New endpoints for shift roster calendar (Feature 004):
- GET /rosters/shifts?month=YYYY-MM — List shifts for month
- POST /rosters/shifts — Create shift assignment
- PUT /rosters/shifts/{shift_id} — Update shift
- DELETE /rosters/shifts/{shift_id} — Delete shift
"""

import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query

from app.dependencies import DbSession, TenantId, require_role, require_role_and_active
from app.schemas.shift import ShiftCreate, ShiftUpdate
from app.services import shift_service

router = APIRouter(tags=["shifts"])


@router.get("/shifts")
def list_shifts(
    session: DbSession,
    tenant_id: TenantId,
    current_user: dict = Depends(require_role("Admin", "Moderador", "Empleado")),
    employee_id: uuid.UUID | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    """
    List shift records (historical clock-in/clock-out records).

    - Admin/Moderador: can list all shifts
    - Empleado: can list only their own shifts (enforced in service layer)
    """
    # Empleado can only see own shifts
    if current_user.get("role") == "Empleado":
        emp_id = current_user.get("employee_id")
        if emp_id:
            employee_id = uuid.UUID(emp_id)
        else:
            return {"items": [], "total": 0, "page": 1, "size": size, "pages": 1}

    return shift_service.list_shifts(
        tenant_id, session, employee_id, date_from, date_to, page, size
    )


# ============================================================================
# NEW ENDPOINTS FOR SHIFT ROSTER CALENDAR (Feature 004: Shift Roster Calendar)
# ============================================================================


@router.get("/rosters/shifts")
def list_roster_shifts(
    session: DbSession,
    tenant_id: TenantId,
    current_user: dict = Depends(require_role("Admin", "Moderador", "Empleado")),
    month: str = Query(..., description="Month in YYYY-MM format"),
    employee_id: uuid.UUID | None = Query(None),
):
    """
    List shifts for a given month (for roster calendar view).

    - Admin/Moderador: see all shifts for the month
    - Empleado: see only own shifts (read-only)
    """
    return shift_service.get_shifts_for_month(
        tenant_id, session, month, employee_id, current_user
    )


@router.post("/rosters/shifts", status_code=201)
def create_roster_shift(
    body: ShiftCreate,
    session: DbSession,
    tenant_id: TenantId,
    current_user: dict = Depends(require_role("Admin", "Moderador")),
):
    """
    Create a new shift assignment (roster planning).

    Only Moderador/Admin can create shifts.
    """
    return shift_service.create_shift(
        tenant_id, session, body.employee_id, body.date, body.shift_type_id, uuid.UUID(current_user.get("sub", ""))
    )


@router.put("/rosters/shifts/{shift_id}")
def update_roster_shift(
    shift_id: uuid.UUID,
    body: ShiftUpdate,
    session: DbSession,
    tenant_id: TenantId,
    current_user: dict = Depends(require_role("Admin", "Moderador")),
):
    """
    Update a shift assignment.

    Only Moderador/Admin can update shifts.
    """
    return shift_service.update_shift(
        tenant_id, session, shift_id, body.shift_type_id, uuid.UUID(current_user.get("sub", ""))
    )


@router.delete("/rosters/shifts/{shift_id}", status_code=204)
def delete_roster_shift(
    shift_id: uuid.UUID,
    session: DbSession,
    tenant_id: TenantId,
    current_user: dict = Depends(require_role("Admin", "Moderador")),
):
    """
    Delete a shift assignment.

    Only Moderador/Admin can delete shifts.
    """
    return shift_service.delete_shift(tenant_id, session, shift_id, uuid.UUID(current_user.get("sub", "")))


# ============================================================================
# EMPLOYEE WORKSPACE PORTAL ENDPOINTS (Feature 005: Employee Workspace)
# ============================================================================
# SECURITY: All endpoints require:
# - Authentication (JWT token)
# - Empleado role
# - is_active=true (password setup completed)
# - RLS: Service layer enforces only current employee's shifts returned


@router.get("/employee/shifts/month")
def get_employee_month_shifts(
    session: DbSession,
    current_user: dict = Depends(require_role_and_active("Empleado")),
    year: int = Query(..., ge=2020, le=2100, description="Year (YYYY)"),
    month: int = Query(..., ge=1, le=12, description="Month (1-12)"),
):
    """
    Get employee's shifts for a specific month.

    SECURITY:
    - Requires: authenticated + Empleado role + is_active=true
    - Returns: only current employee's shifts (RLS enforced in service layer)
    - No employee_id parameter: uses employee_id from JWT

    Query Parameters:
    - year: Year (YYYY) - required
    - month: Month (1-12) - required

    Returns:
    - 200: OK - Shifts for the month
    - 400: Bad Request - Invalid year/month
    - 401: Unauthorized - Not authenticated or is_active=false
    - 403: Forbidden - Not Empleado role
    """
    employee_id = uuid.UUID(current_user.get("employee_id", ""))
    tenant_id = uuid.UUID(current_user.get("tenant_id", ""))

    return shift_service.get_employee_month_shifts(
        tenant_id=tenant_id,
        employee_id=employee_id,
        year=year,
        month=month,
        session=session,
    )


@router.get("/employee/shifts")
def get_employee_shifts(
    session: DbSession,
    current_user: dict = Depends(require_role_and_active("Empleado")),
    date_from: date | None = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: date | None = Query(None, description="End date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    size: int = Query(50, ge=1, le=100, description="Items per page (max 100)"),
):
    """
    Get employee's shifts for a date range.

    SECURITY:
    - Requires: authenticated + Empleado role + is_active=true
    - Returns: only current employee's shifts (RLS enforced in service layer)
    - No employee_id parameter: uses employee_id from JWT

    Query Parameters:
    - date_from: Start date (optional, default: 30 days ago)
    - date_to: End date (optional, default: today)
    - page: Page number (default: 1)
    - size: Items per page (default: 50, max: 100)

    Returns:
    - 200: OK - Paginated list of shifts
    - 400: Bad Request - Invalid date range
    - 401: Unauthorized - Not authenticated or is_active=false
    - 403: Forbidden - Not Empleado role
    """
    employee_id = uuid.UUID(current_user.get("employee_id", ""))
    tenant_id = uuid.UUID(current_user.get("tenant_id", ""))

    return shift_service.get_employee_shifts(
        tenant_id=tenant_id,
        employee_id=employee_id,
        date_from=date_from,
        date_to=date_to,
        page=page,
        size=size,
        session=session,
    )


@router.get("/employee/shifts/today")
def get_employee_today_shift(
    session: DbSession,
    current_user: dict = Depends(require_role_and_active("Empleado")),
):
    """
    Get employee's shift for today.

    SECURITY:
    - Requires: authenticated + Empleado role + is_active=true
    - Returns: only current employee's shift (RLS enforced in service layer)

    Returns:
    - 200: OK - Today's shift (or null if no shift)
    - 401: Unauthorized - Not authenticated or is_active=false
    - 403: Forbidden - Not Empleado role
    - 404: Not Found - No shift assigned for today
    """
    employee_id = uuid.UUID(current_user.get("employee_id", ""))
    tenant_id = uuid.UUID(current_user.get("tenant_id", ""))

    result = shift_service.get_employee_today_shift(
        tenant_id=tenant_id,
        employee_id=employee_id,
        session=session,
    )
    return result or {}


@router.get("/employee/shifts/upcoming")
def get_employee_upcoming_shifts(
    session: DbSession,
    current_user: dict = Depends(require_role_and_active("Empleado")),
    days: int = Query(7, ge=1, le=90, description="Number of days to look ahead (max 90)"),
):
    """
    Get employee's upcoming shifts (next N days).

    SECURITY:
    - Requires: authenticated + Empleado role + is_active=true
    - Returns: only current employee's shifts (RLS enforced in service layer)

    Query Parameters:
    - days: Number of days to look ahead (default: 7, max: 90)

    Returns:
    - 200: OK - Shifts for next N days
    - 401: Unauthorized - Not authenticated or is_active=false
    - 403: Forbidden - Not Empleado role
    """
    employee_id = uuid.UUID(current_user.get("employee_id", ""))
    tenant_id = uuid.UUID(current_user.get("tenant_id", ""))

    return shift_service.get_employee_upcoming_shifts(
        tenant_id=tenant_id,
        employee_id=employee_id,
        days=days,
        session=session,
    )
