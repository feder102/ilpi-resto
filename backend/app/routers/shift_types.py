"""T008: Shift types router."""

import uuid

from fastapi import APIRouter, Depends, Query

from app.dependencies import DbSession, TenantId, require_role
from app.schemas.shift_type import ShiftTypeCreate, ShiftTypeUpdate
from app.services import shift_type_service

router = APIRouter(tags=["shift-types"])

AdminOrMod = Depends(require_role("Admin", "Moderador"))
AdminOnly = Depends(require_role("Admin"))


@router.get("/shift-types")
def list_shift_types(
    session: DbSession,
    tenant_id: TenantId,
    _: dict = AdminOrMod,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    active_only: bool = Query(True),
):
    """List all shift types for the tenant."""
    return shift_type_service.list_shift_types(
        tenant_id, session, active_only=active_only, page=page, size=size
    )


@router.post("/shift-types", status_code=201)
def create_shift_type(
    body: ShiftTypeCreate,
    session: DbSession,
    tenant_id: TenantId,
    _: dict = AdminOrMod,
):
    """Create new shift type."""
    return shift_type_service.create(body, tenant_id, session)


@router.get("/shift-types/{shift_type_id}")
def get_shift_type(
    shift_type_id: uuid.UUID,
    session: DbSession,
    tenant_id: TenantId,
    _: dict = AdminOrMod,
):
    """Get single shift type."""
    return shift_type_service.get_by_id(shift_type_id, tenant_id, session)


@router.put("/shift-types/{shift_type_id}")
def update_shift_type(
    shift_type_id: uuid.UUID,
    body: ShiftTypeUpdate,
    session: DbSession,
    tenant_id: TenantId,
    _: dict = AdminOrMod,
):
    """Update shift type."""
    return shift_type_service.update(shift_type_id, body, tenant_id, session)


@router.delete("/shift-types/{shift_type_id}", status_code=204)
def delete_shift_type(
    shift_type_id: uuid.UUID,
    session: DbSession,
    tenant_id: TenantId,
    _: dict = AdminOnly,
):
    """Delete (soft) shift type."""
    shift_type_service.delete(shift_type_id, tenant_id, session)
