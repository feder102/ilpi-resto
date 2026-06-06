"""Feature 009: Unit tests for dashboard_service (reports from TimeEntry)."""

from datetime import date, time, timedelta
from decimal import Decimal

import pytest
from sqlmodel import Session, SQLModel, create_engine

from app.models.employee import Employee
from app.models.tenant import Tenant
from app.models.time_entry import TimeEntry
from app.models.vacation_request import VacationRequest
from app.services import dashboard_service

TEST_DB = "sqlite:///./test_dashboard_service.db"
engine = create_engine(TEST_DB, connect_args={"check_same_thread": False})


@pytest.fixture(autouse=True)
def setup_db():
    SQLModel.metadata.create_all(engine)
    yield
    SQLModel.metadata.drop_all(engine)


@pytest.fixture
def session():
    with Session(engine) as s:
        yield s


@pytest.fixture
def tenant(session):
    t = Tenant(name="Test", slug="test-dash", timezone="Europe/Madrid", locale="es")
    session.add(t)
    session.commit()
    session.refresh(t)
    return t


@pytest.fixture
def employee(session, tenant):
    emp = Employee(
        tenant_id=tenant.id,
        first_name="Ana",
        last_name="Ruiz",
        email="ana@test.es",
        dni="11111111A",
        role="Empleado",
        department="Cocina",
        status="Activo",
        hire_date=date(2024, 1, 15),
    )
    session.add(emp)
    session.commit()
    session.refresh(emp)
    return emp


def _add_entry(session, tenant_id, employee_id, shift_date, hours):
    entry = TimeEntry(
        tenant_id=tenant_id,
        employee_id=employee_id,
        shift_date=shift_date,
        start_time=time(8, 0),
        end_time=time(14, 0),
        hours_worked=Decimal(str(hours)),
    )
    session.add(entry)
    session.commit()
    return entry


class TestHoursByDay:
    def test_aggregates_from_time_entry(self, session, tenant, employee):
        # Use a Monday well within the default 30-day window
        today = date.today()
        monday = today - timedelta(days=today.weekday())  # this week's Monday
        if monday > today:
            monday -= timedelta(days=7)
        _add_entry(session, tenant.id, employee.id, monday, 6.0)
        _add_entry(session, tenant.id, employee.id, monday, 2.5)

        result = dashboard_service.get_hours_by_day(tenant.id, session)
        by_day = {row["day"]: row["hours"] for row in result}

        assert by_day["Lunes"] == 8.5
        # All 7 weekdays present
        assert len(result) == 7

    def test_empty_when_no_entries(self, session, tenant):
        result = dashboard_service.get_hours_by_day(tenant.id, session)
        assert len(result) == 7
        assert all(row["hours"] == 0.0 for row in result)

    def test_date_range_filter_excludes_outside(self, session, tenant, employee):
        today = date.today()
        old_date = today - timedelta(days=200)
        _add_entry(session, tenant.id, employee.id, old_date, 8.0)

        # Default window (last 30 days) should exclude the old entry
        result = dashboard_service.get_hours_by_day(tenant.id, session)
        assert all(row["hours"] == 0.0 for row in result)

        # Explicit range covering the old entry should include it
        result2 = dashboard_service.get_hours_by_day(
            tenant.id, session, date_from=old_date, date_to=today
        )
        assert sum(row["hours"] for row in result2) == 8.0

    def test_department_filter(self, session, tenant, employee):
        # Another employee in a different department
        emp2 = Employee(
            tenant_id=tenant.id,
            first_name="Beto",
            last_name="Sosa",
            email="beto@test.es",
            dni="22222222B",
            role="Empleado",
            department="Barra",
            status="Activo",
            hire_date=date(2024, 1, 15),
        )
        session.add(emp2)
        session.commit()
        session.refresh(emp2)

        today = date.today()
        _add_entry(session, tenant.id, employee.id, today, 5.0)  # Cocina
        _add_entry(session, tenant.id, emp2.id, today, 3.0)      # Barra

        cocina = dashboard_service.get_hours_by_day(tenant.id, session, department="Cocina")
        assert sum(row["hours"] for row in cocina) == 5.0


class TestStats:
    def test_on_shift_counts_today_time_entries(self, session, tenant, employee):
        today = date.today()
        _add_entry(session, tenant.id, employee.id, today, 6.0)
        _add_entry(session, tenant.id, employee.id, today, 2.0)  # same employee, counts once

        stats = dashboard_service.get_stats(tenant.id, session)
        assert stats["on_shift"] == 1
        assert stats["total_employees"] == 1

    def test_pending_requests_counted(self, session, tenant, employee):
        vr = VacationRequest(
            tenant_id=tenant.id,
            employee_id=employee.id,
            start_date=date.today() + timedelta(days=10),
            end_date=date.today() + timedelta(days=15),
            requested_days=6,
            status="Pendiente",
        )
        session.add(vr)
        session.commit()

        stats = dashboard_service.get_stats(tenant.id, session)
        assert stats["pending_requests"] == 1


class TestDepartmentDistribution:
    def test_counts_active_by_department(self, session, tenant, employee):
        result = dashboard_service.get_department_distribution(tenant.id, session)
        by_dept = {row["department"]: row["count"] for row in result}
        assert by_dept.get("Cocina") == 1

    def test_department_filter(self, session, tenant, employee):
        result = dashboard_service.get_department_distribution(
            tenant.id, session, department="Barra"
        )
        assert result == []
