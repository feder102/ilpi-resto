"""Settings service — vacation configuration for the tenant."""

import uuid

from sqlmodel import Session, select

from app.common.exceptions import NotFoundError
from app.models.tenant import Tenant
from app.services import audit_service

AUDIT_ENTITY_TENANT_VACATION = "tenant_vacation_config"
AUDIT_ACTION_UPDATE_DEFAULT = "update_default_vacation_days"


def get_vacation_settings(tenant_id: uuid.UUID, session: Session) -> Tenant:
    tenant = session.exec(select(Tenant).where(Tenant.id == tenant_id)).first()
    if not tenant:
        raise NotFoundError("Tenant no encontrado")
    return tenant


def update_vacation_settings(
    tenant_id: uuid.UUID,
    new_days: int,
    changed_by: uuid.UUID,
    session: Session,
) -> Tenant:
    tenant = get_vacation_settings(tenant_id, session)

    old_value = str(tenant.default_vacation_days)
    new_value = str(new_days)

    tenant.default_vacation_days = new_days
    session.add(tenant)

    audit_service.log(
        session=session,
        tenant_id=tenant_id,
        entity_type=AUDIT_ENTITY_TENANT_VACATION,
        entity_id=str(tenant_id),
        action=AUDIT_ACTION_UPDATE_DEFAULT,
        old_value=old_value,
        new_value=new_value,
        changed_by=changed_by,
    )

    session.commit()
    session.refresh(tenant)
    return tenant
