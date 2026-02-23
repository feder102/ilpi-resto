"""T047d: Users router — Admin-only user account management."""

import uuid

from fastapi import APIRouter, Depends, Query

from app.dependencies import DbSession, TenantId, require_role
from app.schemas.user import UserCreate, UserUpdate
from app.services import user_service

router = APIRouter(tags=["users"])

AdminOnly = Depends(require_role("Admin"))


@router.get("/users")
def list_users(
    session: DbSession,
    tenant_id: TenantId,
    _: dict = AdminOnly,
    role: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    return user_service.list_users(tenant_id, session, role, page, size)


@router.post("/users", status_code=201)
def create_user(
    body: UserCreate,
    session: DbSession,
    tenant_id: TenantId,
    _: dict = AdminOnly,
):
    return user_service.create_user(body, tenant_id, session)


@router.put("/users/{user_id}")
def update_user(
    user_id: uuid.UUID,
    body: UserUpdate,
    session: DbSession,
    tenant_id: TenantId,
    _: dict = AdminOnly,
):
    return user_service.update_user(user_id, body, tenant_id, session)


@router.delete("/users/{user_id}")
def delete_user(
    user_id: uuid.UUID,
    session: DbSession,
    tenant_id: TenantId,
    _: dict = AdminOnly,
):
    return user_service.deactivate_user(user_id, tenant_id, session)
