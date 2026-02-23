"""T047: Employees router."""

import uuid

from fastapi import APIRouter, Depends, Query

from app.dependencies import CurrentUser, DbSession, TenantId, require_role
from app.schemas.employee import EmployeeCreate, EmployeeResponse, EmployeeUpdate
from app.services import employee_service

router = APIRouter(tags=["employees"])

AdminOrMod = Depends(require_role("Admin", "Moderador"))
AdminOnly = Depends(require_role("Admin"))


@router.get("/employees")
def list_employees(
    session: DbSession,
    tenant_id: TenantId,
    current_user: CurrentUser,
    search: str | None = Query(None),
    department: str | None = Query(None),
    include_inactive: bool = Query(False),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    # Empleado can only see their own profile
    if current_user.get("role") == "Empleado":
        emp_id = current_user.get("employee_id")
        if emp_id:
            emp = employee_service.get_by_id(uuid.UUID(emp_id), tenant_id, session)
            return {"items": [emp], "total": 1, "page": 1, "size": 1, "pages": 1}
        return {"items": [], "total": 0, "page": 1, "size": 1, "pages": 1}

    return employee_service.list_employees(
        tenant_id, session, search, department, include_inactive, page, size
    )


@router.post("/employees", status_code=201, response_model=EmployeeResponse)
def create_employee(
    body: EmployeeCreate,
    session: DbSession,
    tenant_id: TenantId,
    _: dict = AdminOnly,
):
    return employee_service.create(body, tenant_id, session)


@router.get("/employees/{employee_id}", response_model=EmployeeResponse)
def get_employee(
    employee_id: uuid.UUID,
    session: DbSession,
    tenant_id: TenantId,
    current_user: CurrentUser,
):
    # Empleado can only see their own profile
    if current_user.get("role") == "Empleado":
        own_emp_id = current_user.get("employee_id")
        if not own_emp_id or str(employee_id) != own_emp_id:
            from app.common.exceptions import ForbiddenError
            raise ForbiddenError("Solo puede ver su propio perfil")

    return employee_service.get_by_id(employee_id, tenant_id, session)


@router.put("/employees/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: uuid.UUID,
    body: EmployeeUpdate,
    session: DbSession,
    tenant_id: TenantId,
    _: dict = AdminOrMod,
):
    return employee_service.update(employee_id, body, tenant_id, session)


@router.delete("/employees/{employee_id}")
def delete_employee(
    employee_id: uuid.UUID,
    session: DbSession,
    tenant_id: TenantId,
    current_user: CurrentUser,
):
    return employee_service.soft_delete(
        employee_id, tenant_id, current_user.get("role", ""), session
    )
