"""T031/T042/T054: Departments router — ABM de Departamentos (Feature 014)."""

import uuid

from fastapi import APIRouter, Depends, Query

from app.dependencies import CurrentUser, DbSession, TenantId, require_role
from app.schemas.department import (
    DepartmentCreate,
    DepartmentDeletePreview,
    DepartmentDeleteResult,
    DepartmentListResponse,
    DepartmentResponse,
    DepartmentUpdate,
)
from app.services import department_service

router = APIRouter(tags=["departments"])

AdminOnly = Depends(require_role("Admin"))


@router.get("/departments", response_model=DepartmentListResponse)
def list_departments(
    session: DbSession,
    tenant_id: TenantId,
    current_user: CurrentUser,
    include_inactive: bool = Query(False),
    search: str | None = Query(None),
) -> DepartmentListResponse:
    is_admin = current_user.get("role") == "Admin"
    # Non-admins cannot request inactive departments
    effective_inactive = include_inactive and is_admin
    return department_service.list_departments(
        tenant_id, session, effective_inactive, search, is_admin
    )


@router.post("/departments", status_code=201, response_model=DepartmentResponse)
def create_department(
    body: DepartmentCreate,
    session: DbSession,
    tenant_id: TenantId,
    _: dict = AdminOnly,
) -> DepartmentResponse:
    return department_service.create(body, tenant_id, session)


@router.get("/departments/{department_id}", response_model=DepartmentResponse)
def get_department(
    department_id: uuid.UUID,
    session: DbSession,
    tenant_id: TenantId,
    current_user: CurrentUser,
) -> DepartmentResponse:
    is_admin = current_user.get("role") == "Admin"
    return department_service.get_by_id(department_id, tenant_id, session, is_admin)


@router.put("/departments/{department_id}", response_model=DepartmentResponse)
def update_department(
    department_id: uuid.UUID,
    body: DepartmentUpdate,
    session: DbSession,
    tenant_id: TenantId,
    _: dict = AdminOnly,
) -> DepartmentResponse:
    return department_service.update(department_id, body, tenant_id, session)


@router.get(
    "/departments/{department_id}/delete-preview",
    response_model=DepartmentDeletePreview,
)
def delete_preview(
    department_id: uuid.UUID,
    session: DbSession,
    tenant_id: TenantId,
    _: dict = AdminOnly,
) -> DepartmentDeletePreview:
    return department_service.get_delete_preview(department_id, tenant_id, session)


@router.delete("/departments/{department_id}", response_model=DepartmentDeleteResult)
def delete_department(
    department_id: uuid.UUID,
    session: DbSession,
    tenant_id: TenantId,
    _: dict = AdminOnly,
) -> DepartmentDeleteResult:
    return department_service.delete_with_reassign(department_id, tenant_id, session)
