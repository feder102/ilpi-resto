"""Tests for vacation_service — advance notice, year rules, and balance override."""

from datetime import date

import pytest
from dateutil.relativedelta import relativedelta
from sqlmodel import Session

from app.common.exceptions import AdvanceNoticeRequiredError, ValidationError
from app.models.employee import Employee
from app.models.tenant import Tenant
from app.services import vacation_service

# ─── fixtures ────────────────────────────────────────────────────────────────


@pytest.fixture
def tenant(session: Session) -> Tenant:
    t = Tenant(
        name="Vac Service Tenant",
        slug="vac-svc",
        timezone="Europe/Madrid",
        locale="es",
        default_vacation_days=30,
    )
    session.add(t)
    session.commit()
    session.refresh(t)
    return t


@pytest.fixture
def employee(session: Session, tenant: Tenant) -> Employee:
    emp = Employee(
        tenant_id=tenant.id,
        first_name="Ana",
        last_name="López",
        email="ana@test.es",
        dni="11111111A",
        role="Empleado",
        department="Cocina",
        hire_date=date(2024, 1, 15),
    )
    session.add(emp)
    session.commit()
    session.refresh(emp)
    return emp


# ─── advance notice tests ────────────────────────────────────────────────────


def test_employee_request_below_2_months_raises(
    session: Session, tenant: Tenant, employee: Employee
) -> None:
    start = date.today() + relativedelta(months=2) - relativedelta(days=1)
    end = date(start.year, start.month, start.day) + relativedelta(days=4)
    if end > date(start.year, 12, 31):
        end = date(start.year, 12, 31)
    with pytest.raises(AdvanceNoticeRequiredError):
        vacation_service.create_request(
            employee_id=employee.id,
            start_date=start,
            end_date=end,
            tenant_id=tenant.id,
            session=session,
            is_employee_request=True,
        )


def test_employee_request_exactly_2_months_passes(
    session: Session, tenant: Tenant, employee: Employee
) -> None:
    start = date.today() + relativedelta(months=2)
    end = start + relativedelta(days=4)
    if end > date(start.year, 12, 31):
        end = date(start.year, 12, 31)
    result = vacation_service.create_request(
        employee_id=employee.id,
        start_date=start,
        end_date=end,
        tenant_id=tenant.id,
        session=session,
        is_employee_request=True,
    )
    assert result.status == "Pendiente"


def test_admin_request_bypasses_advance_notice(
    session: Session, tenant: Tenant, employee: Employee
) -> None:
    start = date.today() + relativedelta(days=5)
    end = start + relativedelta(days=2)
    if end > date(start.year, 12, 31):
        end = date(start.year, 12, 31)
    result = vacation_service.create_request(
        employee_id=employee.id,
        start_date=start,
        end_date=end,
        tenant_id=tenant.id,
        session=session,
        is_employee_request=False,
    )
    assert result.status == "Pendiente"


# ─── calendar year validation ─────────────────────────────────────────────────


def test_end_date_crossing_year_boundary_raises(
    session: Session, tenant: Tenant, employee: Employee
) -> None:
    start = date(date.today().year, 12, 28)
    end = date(date.today().year + 1, 1, 3)
    with pytest.raises(ValidationError) as exc_info:
        vacation_service.create_request(
            employee_id=employee.id,
            start_date=start,
            end_date=end,
            tenant_id=tenant.id,
            session=session,
            is_employee_request=False,
        )
    assert exc_info.value.code == "CALENDAR_YEAR_VIOLATION"


def test_end_date_on_dec_31_passes(
    session: Session, tenant: Tenant, employee: Employee
) -> None:
    year = date.today().year
    start = date(year, 12, 28)
    end = date(year, 12, 31)
    result = vacation_service.create_request(
        employee_id=employee.id,
        start_date=start,
        end_date=end,
        tenant_id=tenant.id,
        session=session,
        is_employee_request=False,
    )
    assert result.status == "Pendiente"


# ─── balance override tests ───────────────────────────────────────────────────


def test_balance_uses_employee_custom_vacation_days(
    session: Session, tenant: Tenant, employee: Employee
) -> None:
    employee.custom_vacation_days = 35
    session.add(employee)
    session.commit()

    year = date.today().year
    balance = vacation_service._get_or_create_balance(
        employee_id=employee.id,
        year=year,
        tenant_id=tenant.id,
        session=session,
    )
    assert balance.total_days == 35


def test_balance_uses_tenant_default_when_no_override(
    session: Session, tenant: Tenant, employee: Employee
) -> None:
    tenant.default_vacation_days = 28
    session.add(tenant)
    session.commit()

    year = date.today().year
    balance = vacation_service._get_or_create_balance(
        employee_id=employee.id,
        year=year,
        tenant_id=tenant.id,
        session=session,
    )
    assert balance.total_days == 28


def test_balance_employee_override_takes_precedence_over_tenant(
    session: Session, tenant: Tenant, employee: Employee
) -> None:
    tenant.default_vacation_days = 28
    employee.custom_vacation_days = 20
    session.add(tenant)
    session.add(employee)
    session.commit()

    year = date.today().year
    balance = vacation_service._get_or_create_balance(
        employee_id=employee.id,
        year=year,
        tenant_id=tenant.id,
        session=session,
    )
    assert balance.total_days == 20
