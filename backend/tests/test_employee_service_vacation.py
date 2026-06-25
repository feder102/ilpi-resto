"""Tests for employee_service.update() — custom_vacation_days audit trail."""

import uuid
from datetime import date

import pytest
from passlib.context import CryptContext
from sqlmodel import Session, select

from app.models.audit_log import AuditLog
from app.models.employee import Employee
from app.models.tenant import Tenant
from app.schemas.employee import EmployeeUpdate
from app.services import employee_service

# ─── fixtures ────────────────────────────────────────────────────────────────


@pytest.fixture
def tenant(session: Session) -> Tenant:
    t = Tenant(
        name="Emp Vac Test",
        slug="emp-vac",
        timezone="Europe/Madrid",
        locale="es",
        default_vacation_days=30,
    )
    session.add(t)
    session.commit()
    session.refresh(t)
    return t


@pytest.fixture
def changed_by(session: Session, tenant: Tenant) -> uuid.UUID:
    from app.models.user import User

    ctx = CryptContext(schemes=["plaintext"], deprecated="auto")
    u = User(
        tenant_id=tenant.id,
        email="admin@emp.es",
        hashed_password=ctx.hash("pass"),
        role="Admin",
    )
    session.add(u)
    session.commit()
    session.refresh(u)
    return u.id  # type: ignore[return-value]


@pytest.fixture
def employee(session: Session, tenant: Tenant) -> Employee:
    emp = Employee(
        tenant_id=tenant.id,
        first_name="Carlos",
        last_name="Ruiz",
        email="carlos@emp.es",
        dni="22222222B",
        role="Empleado",
        department="Cocina",
        hire_date=date(2024, 3, 1),
    )
    session.add(emp)
    session.commit()
    session.refresh(emp)
    return emp


# ─── tests ───────────────────────────────────────────────────────────────────


def test_update_custom_vacation_days_creates_audit_log(
    session: Session, tenant: Tenant, employee: Employee, changed_by: uuid.UUID
) -> None:
    employee_service.update(
        employee_id=employee.id,
        data=EmployeeUpdate(custom_vacation_days=20),
        tenant_id=tenant.id,
        session=session,
        changed_by=changed_by,
    )

    entries = session.exec(select(AuditLog).where(AuditLog.tenant_id == tenant.id)).all()
    assert len(entries) == 1
    entry = entries[0]
    assert entry.entity_type == "employee_vacation_config"
    assert entry.entity_id == str(employee.id)
    assert entry.action == "update_employee_vacation_days"
    assert entry.old_value == "None"
    assert entry.new_value == "20"
    assert entry.changed_by == changed_by


def test_update_custom_vacation_days_to_none_creates_audit_log(
    session: Session, tenant: Tenant, employee: Employee, changed_by: uuid.UUID
) -> None:
    # First set to 25
    employee.custom_vacation_days = 25
    session.add(employee)
    session.commit()

    employee_service.update(
        employee_id=employee.id,
        data=EmployeeUpdate(custom_vacation_days=None),
        tenant_id=tenant.id,
        session=session,
        changed_by=changed_by,
    )

    entries = session.exec(select(AuditLog).where(AuditLog.tenant_id == tenant.id)).all()
    assert len(entries) == 1
    entry = entries[0]
    assert entry.old_value == "25"
    assert entry.new_value == "None"


def test_update_same_value_no_audit_log(
    session: Session, tenant: Tenant, employee: Employee, changed_by: uuid.UUID
) -> None:
    employee.custom_vacation_days = 20
    session.add(employee)
    session.commit()

    employee_service.update(
        employee_id=employee.id,
        data=EmployeeUpdate(custom_vacation_days=20),
        tenant_id=tenant.id,
        session=session,
        changed_by=changed_by,
    )

    entries = session.exec(select(AuditLog).where(AuditLog.tenant_id == tenant.id)).all()
    assert len(entries) == 0


def test_update_without_changed_by_no_audit_log(
    session: Session, tenant: Tenant, employee: Employee
) -> None:
    employee_service.update(
        employee_id=employee.id,
        data=EmployeeUpdate(custom_vacation_days=15),
        tenant_id=tenant.id,
        session=session,
        changed_by=None,
    )

    entries = session.exec(select(AuditLog).where(AuditLog.tenant_id == tenant.id)).all()
    assert len(entries) == 0


def test_update_other_field_no_audit_log(
    session: Session, tenant: Tenant, employee: Employee, changed_by: uuid.UUID
) -> None:
    employee_service.update(
        employee_id=employee.id,
        data=EmployeeUpdate(first_name="Roberto"),
        tenant_id=tenant.id,
        session=session,
        changed_by=changed_by,
    )

    entries = session.exec(select(AuditLog).where(AuditLog.tenant_id == tenant.id)).all()
    assert len(entries) == 0
