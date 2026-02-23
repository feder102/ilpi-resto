"""T068: Shifts router."""

import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query

from app.dependencies import CurrentUser, DbSession, TenantId, require_role
from app.schemas.shift import ClockInRequest, ClockOutRequest
from app.services import shift_service

router = APIRouter(tags=["shifts"])

AdminOrMod = Depends(require_role("Admin", "Moderador"))


@router.get("/shifts")
def list_shifts(
    session: DbSession,
    tenant_id: TenantId,
    current_user: CurrentUser,
    employee_id: uuid.UUID | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
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
    current_user: CurrentUser,
):
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
    current_user: CurrentUser,
):
    return shift_service.clock_out(
        shift_id, tenant_id, session, body.location_lat, body.location_lng
    )
