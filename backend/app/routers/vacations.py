"""T056: Vacations router."""

import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query

from app.dependencies import (
    CurrentUser,
    DbSession,
    TenantId,
    require_role,
    require_role_and_active,
)
from app.schemas.vacation import (
    VacationActionRequest,
    VacationRequestCreate,
    VacationRequestCreateEmployee,
)
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
    current_user: dict = Depends(require_role("Admin", "Moderador", "Empleado")),
    year: int | None = Query(None),
):
    target_year = year or date.today().year
    return vacation_service.get_balance(employee_id, target_year, tenant_id, session)


# ============================================================================
# EMPLOYEE WORKSPACE PORTAL ENDPOINTS (Feature 005: Vacation Requests - US3)
# ============================================================================
# SECURITY: All endpoints require:
# - Authentication (JWT token)
# - Empleado role
# - is_active=true (password setup completed)
# - RLS: Service layer enforces only current employee's data returned


@router.get("/employee/vacation-balance")
def get_employee_vacation_balance(
    session: DbSession,
    current_user: dict = Depends(require_role_and_active("Empleado")),
    year: int | None = Query(None),
):
    """
    Get current year vacation balance for authenticated employee.

    SECURITY:
    - Requires: authenticated + Empleado role + is_active=true
    - Returns: only current employee's balance

    Query Parameters:
    - year: Fiscal year (default: current year)

    Returns:
    - 200: OK - Vacation balance with remaining days
    - 401: Unauthorized - Not authenticated or is_active=false
    - 403: Forbidden - Not Empleado role
    """
    employee_id = uuid.UUID(current_user.get("employee_id", ""))
    tenant_id = uuid.UUID(current_user.get("tenant_id", ""))
    target_year = year or date.today().year

    return vacation_service.get_balance(
        employee_id=employee_id,
        year=target_year,
        tenant_id=tenant_id,
        session=session,
    )


@router.get("/employee/vacation-requests")
def get_employee_vacation_requests(
    session: DbSession,
    current_user: dict = Depends(require_role_and_active("Empleado")),
    status: str | None = Query(None, description="Filter by status: Pendiente|Aprobado|Rechazado|Cancelado"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    size: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
):
    """
    List all vacation requests for authenticated employee.

    SECURITY:
    - Requires: authenticated + Empleado role + is_active=true
    - Returns: only current employee's requests (RLS enforced)

    Query Parameters:
    - status: Filter by request status (optional)
    - page: Page number (default: 1)
    - size: Items per page (default: 20, max: 100)

    Returns:
    - 200: OK - Paginated list of vacation requests
    - 401: Unauthorized - Not authenticated or is_active=false
    - 403: Forbidden - Not Empleado role
    """
    employee_id = uuid.UUID(current_user.get("employee_id", ""))
    tenant_id = uuid.UUID(current_user.get("tenant_id", ""))

    return vacation_service.list_requests(
        tenant_id=tenant_id,
        session=session,
        employee_id=employee_id,
        status_filter=status,
        page=page,
        size=size,
    )


@router.post("/employee/vacation-requests", status_code=201)
def create_employee_vacation_request(
    body: VacationRequestCreateEmployee,
    session: DbSession,
    current_user: dict = Depends(require_role_and_active("Empleado")),
):
    """
    Submit new vacation request for authenticated employee.

    CRITICAL SECURITY VALIDATION:
    ✅ Must have sufficient vacation balance (remaining_days >= requested_days)
    ✅ Cannot request more days than available in VacationBalance
    ✅ Start date must be before or equal to end date
    ✅ Only current employee can submit request for themselves

    Parameters:
    - start_date: Beginning of vacation (YYYY-MM-DD)
    - end_date: End of vacation (YYYY-MM-DD), inclusive

    Returns:
    - 201: Created - Vacation request created with Pendiente status
    - 400: Bad Request - Invalid date range or insufficient balance
    - 401: Unauthorized - Not authenticated or is_active=false
    - 403: Forbidden - Not Empleado role
    - 422: Unprocessable Entity - Business logic validation failed
    """
    employee_id = uuid.UUID(current_user.get("employee_id", ""))
    tenant_id = uuid.UUID(current_user.get("tenant_id", ""))

    return vacation_service.create_request(
        employee_id=employee_id,
        start_date=body.start_date,
        end_date=body.end_date,
        tenant_id=tenant_id,
        session=session,
    )


@router.put("/employee/vacation-requests/{request_id}/cancel", status_code=200)
def cancel_employee_vacation_request(
    request_id: uuid.UUID,
    body: VacationActionRequest,
    session: DbSession,
    current_user: dict = Depends(require_role_and_active("Empleado")),
):
    """
    Cancel pending vacation request.

    CRITICAL SECURITY VALIDATION:
    ✅ Employee can only cancel their own requests (RLS enforced)
    ✅ Can only cancel if status == Pendiente
    ✅ Cannot cancel Aprobado or Rechazado requests

    Parameters:
    - request_id: UUID of the vacation request
    - version: Current version (for conflict detection)

    Returns:
    - 200: OK - Request cancelled successfully
    - 400: Bad Request - Cannot cancel if Aprobado or Rechazado
    - 401: Unauthorized - Not authenticated or is_active=false
    - 403: Forbidden - Not Empleado role or not your request
    - 404: Not Found - Request not found
    - 409: Conflict - Request was modified (version mismatch)
    """
    employee_id = uuid.UUID(current_user.get("employee_id", ""))
    tenant_id = uuid.UUID(current_user.get("tenant_id", ""))

    return vacation_service.cancel(
        request_id=request_id,
        version=body.version,
        employee_id=employee_id,
        tenant_id=tenant_id,
        session=session,
    )
