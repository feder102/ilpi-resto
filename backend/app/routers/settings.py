"""Settings router — vacation configuration endpoints."""

import uuid
from math import ceil

from fastapi import APIRouter, Depends, Query
from sqlmodel import select

from app.common.exceptions import handle_exceptions
from app.dependencies import CurrentUser, DbSession, TenantId, require_role
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.audit_log import AuditLogRead, PaginatedAuditLog
from app.schemas.settings import VacationSettingsRead, VacationSettingsUpdate
from app.services import settings_service

router = APIRouter(prefix="/settings", tags=["settings"])

AdminOrMod = Depends(require_role("Admin", "Moderador"))
AdminOnly = Depends(require_role("Admin"))

VACATION_ENTITY_TYPES = {"tenant_vacation_config", "employee_vacation_config"}


@router.get("/vacations", response_model=VacationSettingsRead)
@handle_exceptions
def get_vacation_settings(
    session: DbSession,
    tenant_id: TenantId,
    _: dict = AdminOrMod,
) -> VacationSettingsRead:
    tenant = settings_service.get_vacation_settings(tenant_id, session)
    return VacationSettingsRead(default_vacation_days=tenant.default_vacation_days)


@router.put("/vacations", response_model=VacationSettingsRead)
@handle_exceptions
def update_vacation_settings(
    body: VacationSettingsUpdate,
    session: DbSession,
    tenant_id: TenantId,
    current_user: CurrentUser,
    _: dict = AdminOrMod,
) -> VacationSettingsRead:
    tenant = settings_service.update_vacation_settings(
        tenant_id=tenant_id,
        new_days=body.default_vacation_days,
        changed_by=uuid.UUID(current_user["sub"]),
        session=session,
    )
    return VacationSettingsRead(default_vacation_days=tenant.default_vacation_days)


@router.get("/audit-log", response_model=PaginatedAuditLog)
@handle_exceptions
def get_audit_log(
    session: DbSession,
    tenant_id: TenantId,
    current_user: CurrentUser,
    _role: dict = AdminOrMod,
    entity_type: str | None = Query(None),
    entity_id: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
) -> PaginatedAuditLog:
    user_role = current_user.get("role")

    query = select(AuditLog).where(AuditLog.tenant_id == tenant_id)

    # Moderador sees only vacation config entity types
    if user_role != "Admin":
        if entity_type and entity_type not in VACATION_ENTITY_TYPES:
            return PaginatedAuditLog(items=[], total=0, page=page, size=size, pages=1)
        query = query.where(AuditLog.entity_type.in_(list(VACATION_ENTITY_TYPES)))  # type: ignore[attr-defined]
    elif entity_type:
        query = query.where(AuditLog.entity_type == entity_type)

    if entity_id:
        query = query.where(AuditLog.entity_id == entity_id)

    query = query.order_by(AuditLog.created_at.desc())  # type: ignore[union-attr]

    all_logs = session.exec(query).all()
    total = len(all_logs)
    pages = ceil(total / size) if total > 0 else 1
    offset = (page - 1) * size
    page_logs = all_logs[offset : offset + size]

    # Join with User to get changed_by_email
    items: list[AuditLogRead] = []
    for entry in page_logs:
        user = session.get(User, entry.changed_by)
        items.append(
            AuditLogRead(
                id=entry.id,
                entity_type=entry.entity_type,
                entity_id=entry.entity_id,
                action=entry.action,
                old_value=entry.old_value,
                new_value=entry.new_value,
                changed_by=entry.changed_by,
                changed_by_email=user.email if user else None,
                created_at=entry.created_at,
            )
        )

    return PaginatedAuditLog(items=items, total=total, page=page, size=size, pages=pages)
