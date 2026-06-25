"""Tests for settings_service and audit_service — vacation configuration."""

import uuid

import pytest
from sqlmodel import Session, select

from app.models.audit_log import AuditLog
from app.models.tenant import Tenant
from app.services import settings_service

# ─── fixtures ────────────────────────────────────────────────────────────────


@pytest.fixture
def tenant(session: Session) -> Tenant:
    t = Tenant(
        name="Config Test Tenant",
        slug="cfg-test",
        timezone="Europe/Madrid",
        locale="es",
        default_vacation_days=30,
    )
    session.add(t)
    session.commit()
    session.refresh(t)
    return t


@pytest.fixture
def user_id(session: Session, tenant: Tenant) -> uuid.UUID:
    from passlib.context import CryptContext

    from app.models.user import User

    ctx = CryptContext(schemes=["plaintext"], deprecated="auto")
    u = User(
        tenant_id=tenant.id,
        email="admin@cfg.es",
        hashed_password=ctx.hash("pass"),
        role="Admin",
    )
    session.add(u)
    session.commit()
    session.refresh(u)
    return u.id  # type: ignore[return-value]


# ─── settings_service tests ───────────────────────────────────────────────────


def test_get_vacation_settings_returns_default(session: Session, tenant: Tenant) -> None:
    result = settings_service.get_vacation_settings(tenant.id, session)
    assert result.default_vacation_days == 30


def test_update_vacation_settings_changes_value(
    session: Session, tenant: Tenant, user_id: uuid.UUID
) -> None:
    updated = settings_service.update_vacation_settings(tenant.id, 25, user_id, session)
    assert updated.default_vacation_days == 25

    # Persisted
    refreshed = settings_service.get_vacation_settings(tenant.id, session)
    assert refreshed.default_vacation_days == 25


def test_update_vacation_settings_creates_audit_log(
    session: Session, tenant: Tenant, user_id: uuid.UUID
) -> None:
    settings_service.update_vacation_settings(tenant.id, 20, user_id, session)

    entries = session.exec(select(AuditLog).where(AuditLog.tenant_id == tenant.id)).all()
    assert len(entries) == 1
    entry = entries[0]
    assert entry.entity_type == "tenant_vacation_config"
    assert entry.action == "update_default_vacation_days"
    assert entry.old_value == "30"
    assert entry.new_value == "20"
    assert entry.changed_by == user_id


def test_get_vacation_settings_not_found(session: Session) -> None:
    from app.common.exceptions import NotFoundError

    with pytest.raises(NotFoundError):
        settings_service.get_vacation_settings(uuid.uuid4(), session)


# ─── RBAC endpoint tests ──────────────────────────────────────────────────────


def test_get_vacation_settings_forbidden_for_employee(client, emp_headers) -> None:
    r = client.get("/api/v1/settings/vacations", headers=emp_headers)
    assert r.status_code == 403


def test_get_vacation_settings_allowed_for_admin(client, admin_headers) -> None:
    r = client.get("/api/v1/settings/vacations", headers=admin_headers)
    assert r.status_code == 200
    assert "default_vacation_days" in r.json()


def test_get_vacation_settings_allowed_for_mod(client, mod_headers) -> None:
    r = client.get("/api/v1/settings/vacations", headers=mod_headers)
    assert r.status_code == 200


def test_put_vacation_settings_validates_range(client, admin_headers) -> None:
    r = client.put(
        "/api/v1/settings/vacations",
        json={"default_vacation_days": 0},
        headers=admin_headers,
    )
    assert r.status_code == 422


def test_put_vacation_settings_validates_max(client, admin_headers) -> None:
    r = client.put(
        "/api/v1/settings/vacations",
        json={"default_vacation_days": 400},
        headers=admin_headers,
    )
    assert r.status_code == 422
