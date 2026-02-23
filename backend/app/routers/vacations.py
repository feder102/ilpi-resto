"""T056: Vacations router."""

import uuid

from fastapi import APIRouter, Depends, Query

from app.dependencies import CurrentUser, DbSession, TenantId, require_role
from app.schemas.vacation import VacationActionRequest, VacationRequestCreate
from app.services import vacation_service

router = APIRouter(tags=["vacations"])

AdminOrMod = Depends(require_role("Admin", "Moderador"))


@router.get("/vacations")
def list_vacations(
    session: DbSession,
    tenant_id: TenantId,
    current_user: CurrentUser,
    status: str | None = Query(None),
    employee_id: uuid.UUID | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    if current_user.get("role") == "Empleado":
        emp_id = current_user.get("employee_id")
        if emp_id:
            employee_id = uuid.UUID(emp_id)
        else:
            return {"items": [], "total": 0, "page": 1, "size": size, "pages": 1}

    return vacation_service.list_requests(
        tenant_id, session, employee_id, status, page, size
    )


@router.post("/vacations", status_code=201)
def create_vacation(
    body: VacationRequestCreate,
    session: DbSession,
    tenant_id: TenantId,
    current_user: CurrentUser,
):
    return vacation_service.create_request(
        body.employee_id, body.start_date, body.end_date, tenant_id, session
    )


@router.put("/vacations/{request_id}/approve")
def approve_vacation(
    request_id: uuid.UUID,
    body: VacationActionRequest,
    session: DbSession,
    tenant_id: TenantId,
    current_user: CurrentUser,
    _: dict = AdminOrMod,
):
    return vacation_service.approve(
        request_id, body.version, uuid.UUID(current_user["sub"]), tenant_id, session
    )


@router.put("/vacations/{request_id}/reject")
def reject_vacation(
    request_id: uuid.UUID,
    body: VacationActionRequest,
    session: DbSession,
    tenant_id: TenantId,
    current_user: CurrentUser,
    _: dict = AdminOrMod,
):
    return vacation_service.reject(
        request_id, body.version, uuid.UUID(current_user["sub"]), tenant_id, session
    )


@router.put("/vacations/{request_id}/cancel")
def cancel_vacation(
    request_id: uuid.UUID,
    body: VacationActionRequest,
    session: DbSession,
    tenant_id: TenantId,
    current_user: CurrentUser,
):
    emp_id = current_user.get("employee_id")
    if not emp_id:
        from app.common.exceptions import ForbiddenError
        raise ForbiddenError("No tiene un perfil de empleado asociado")

    return vacation_service.cancel(
        request_id, body.version, uuid.UUID(emp_id), tenant_id, session
    )


@router.get("/vacations/balance/{employee_id}")
def get_balance(
    employee_id: uuid.UUID,
    session: DbSession,
    tenant_id: TenantId,
    current_user: CurrentUser,
    year: int | None = Query(None),
):
    from datetime import date

    target_year = year or date.today().year
    return vacation_service.get_balance(employee_id, target_year, tenant_id, session)
