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

from app.dependencies import DbSession, TenantId, require_role
from app.schemas.shift import ClockInRequest, ClockOutRequest, ShiftCreate, ShiftUpdate
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


@router.post("/shifts/clock-in", status_code=201)
def clock_in(
    body: ClockInRequest,
    session: DbSession,
    tenant_id: TenantId,
    current_user: dict = Depends(require_role("Admin", "Moderador", "Empleado")),
):
    """
    Clock in for a shift (time tracking).

    - Admin/Moderador: can clock in for any employee
    - Empleado: can clock in for themselves only (enforced in service layer)
    """
    return shift_service.clock_in(
        body.employee_id,
        tenant_id,
        session,
        body.location_lat,
        body.location_lng,
        body.task_label,
    )


@router.post("/shifts/{shift_id}/clock-out")
def clock_out(
    shift_id: uuid.UUID,
    body: ClockOutRequest,
    session: DbSession,
    tenant_id: TenantId,
    current_user: dict = Depends(require_role("Admin", "Moderador", "Empleado")),
):
    """
    Clock out from an active shift (time tracking).

    - Admin/Moderador: can clock out any shift
    - Empleado: can clock out their own shifts only (enforced in service layer)
    """
    return shift_service.clock_out(
        shift_id, tenant_id, session, body.location_lat, body.location_lng
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
