"""Audit service — generic helper to persist AuditLog entries."""

import uuid

from sqlmodel import Session

from app.models.audit_log import AuditLog


def log(
    session: Session,
    tenant_id: uuid.UUID,
    entity_type: str,
    entity_id: str,
    action: str,
    old_value: str | None,
    new_value: str | None,
    changed_by: uuid.UUID,
) -> None:
    entry = AuditLog(
        tenant_id=tenant_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        old_value=old_value,
        new_value=new_value,
        changed_by=changed_by,
    )
    session.add(entry)
    session.flush()
