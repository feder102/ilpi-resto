"""Tests for audit_service.log()."""

import uuid

import pytest
from passlib.context import CryptContext
from sqlmodel import Session, select

from app.models.audit_log import AuditLog
from app.models.tenant import Tenant
from app.models.user import User
from app.services import audit_service

# ─── fixtures ────────────────────────────────────────────────────────────────


@pytest.fixture
def tenant(session: Session) -> Tenant:
    t = Tenant(
        name="Audit Test Tenant",
        slug="audit-test",
        timezone="Europe/Madrid",
        locale="es",
    )
    session.add(t)
    session.commit()
    session.refresh(t)
    return t


@pytest.fixture
def user_id(session: Session, tenant: Tenant) -> uuid.UUID:
    ctx = CryptContext(schemes=["plaintext"], deprecated="auto")
    u = User(
        tenant_id=tenant.id,
        email="changer@audit.es",
        hashed_password=ctx.hash("pass"),
        role="Admin",
    )
    session.add(u)
    session.commit()
    session.refresh(u)
    return u.id  # type: ignore[return-value]


# ─── tests ───────────────────────────────────────────────────────────────────


def test_log_creates_entry_with_all_fields(
    session: Session, tenant: Tenant, user_id: uuid.UUID
) -> None:
    entity_id = str(tenant.id)
    audit_service.log(
        session=session,
        tenant_id=tenant.id,
        entity_type="tenant_vacation_config",
        entity_id=entity_id,
        action="update_default_vacation_days",
        old_value="30",
        new_value="25",
        changed_by=user_id,
    )
    session.commit()

    entries = session.exec(select(AuditLog).where(AuditLog.tenant_id == tenant.id)).all()
    assert len(entries) == 1
    entry = entries[0]
    assert entry.entity_type == "tenant_vacation_config"
    assert entry.entity_id == entity_id
    assert entry.action == "update_default_vacation_days"
    assert entry.old_value == "30"
    assert entry.new_value == "25"
    assert entry.changed_by == user_id
    assert entry.tenant_id == tenant.id
    assert entry.created_at is not None


def test_log_with_none_old_value(
    session: Session, tenant: Tenant, user_id: uuid.UUID
) -> None:
    audit_service.log(
        session=session,
        tenant_id=tenant.id,
        entity_type="employee_vacation_config",
        entity_id="emp-123",
        action="update_employee_vacation_days",
        old_value=None,
        new_value="20",
        changed_by=user_id,
    )
    session.commit()

    entry = session.exec(select(AuditLog).where(AuditLog.tenant_id == tenant.id)).first()
    assert entry is not None
    assert entry.old_value is None
    assert entry.new_value == "20"


def test_log_with_none_new_value(
    session: Session, tenant: Tenant, user_id: uuid.UUID
) -> None:
    audit_service.log(
        session=session,
        tenant_id=tenant.id,
        entity_type="employee_vacation_config",
        entity_id="emp-456",
        action="update_employee_vacation_days",
        old_value="20",
        new_value=None,
        changed_by=user_id,
    )
    session.commit()

    entry = session.exec(select(AuditLog).where(AuditLog.tenant_id == tenant.id)).first()
    assert entry is not None
    assert entry.old_value == "20"
    assert entry.new_value is None


def test_log_multiple_entries_independent(
    session: Session, tenant: Tenant, user_id: uuid.UUID
) -> None:
    for i in range(3):
        audit_service.log(
            session=session,
            tenant_id=tenant.id,
            entity_type="tenant_vacation_config",
            entity_id=str(tenant.id),
            action="update_default_vacation_days",
            old_value=str(30 + i),
            new_value=str(31 + i),
            changed_by=user_id,
        )
    session.commit()

    entries = session.exec(select(AuditLog).where(AuditLog.tenant_id == tenant.id)).all()
    assert len(entries) == 3
    values = [e.old_value for e in entries]
    assert "30" in values
    assert "31" in values
    assert "32" in values
