"""Feature 015: Unit tests for metrics_service (personnel metrics reports).

Uses a self-contained SQLite engine that creates every table except
``department`` — that table carries a PostgreSQL-only CHECK constraint
(``color ~ '...'``) that SQLite cannot compile. Employees reference a
department via an (unenforced) FK, so a random ``department_id`` is fine here.
"""

import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest
from sqlmodel import Session, SQLModel, create_engine

import app.models  # noqa: F401  (register all tables on SQLModel.metadata)
from app.common.exceptions import ForbiddenError
from app.models.absence import Absence
from app.models.employee import Employee
from app.models.shift_record import ShiftRecord
from app.models.tenant import Tenant
from app.models.time_entry import TimeEntry, TimeEntrySource
from app.models.vacation_balance import VacationBalance
from app.services import metrics_service

ADMIN = {"role": "Admin"}


@pytest.fixture
def session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    tables = [t for t in SQLModel.metadata.sorted_tables if t.name != "department"]
    SQLModel.metadata.create_all(engine, tables=tables)
    with Session(engine) as s:
        yield s


@pytest.fixture
def tenant(session):
    t = Tenant(name="T", slug="t-metrics", timezone="Europe/Madrid", locale="es")
    session.add(t)
    session.commit()
    session.refresh(t)
    return t


def _make_employee(session, tenant_id, first="Ana", last="Ruiz", hire=date(2024, 1, 15), active=True):
    emp = Employee(
        tenant_id=tenant_id,
        first_name=first,
        last_name=last,
        email=f"{first.lower()}.{uuid.uuid4().hex[:6]}@test.es",
        dni=uuid.uuid4().hex[:9],
        role="Empleado",
        department_id=uuid.uuid4(),
        status="Activo" if active else "Inactivo",
        hire_date=hire,
        is_active=active,
    )
    session.add(emp)
    session.commit()
    session.refresh(emp)
    return emp


def _add_hours(session, tenant_id, employee_id, day, hours, source):
    entry = TimeEntry(
        tenant_id=tenant_id,
        employee_id=employee_id,
        shift_date=day,
        hours_worked=Decimal(str(hours)),
        source=source,
    )
    session.add(entry)
    session.commit()
    return entry


class TestOvertimeRatio:
    def test_ratio_computed(self, session, tenant):
        emp = _make_employee(session, tenant.id)
        today = date.today()
        _add_hours(session, tenant.id, emp.id, today, 800, TimeEntrySource.SHIFT)
        _add_hours(session, tenant.id, emp.id, today, 120, TimeEntrySource.EXTRA)

        res = metrics_service.get_overtime_ratio(session, tenant.id, ADMIN)
        assert res.ordinary_hours == 800.0
        assert res.extra_hours == 120.0
        assert res.ratio_pct == 15.0

    def test_ratio_none_without_ordinary(self, session, tenant):
        emp = _make_employee(session, tenant.id)
        _add_hours(session, tenant.id, emp.id, date.today(), 10, TimeEntrySource.EXTRA)

        res = metrics_service.get_overtime_ratio(session, tenant.id, ADMIN)
        assert res.ordinary_hours == 0.0
        assert res.ratio_pct is None

    def test_range_excludes_outside(self, session, tenant):
        emp = _make_employee(session, tenant.id)
        old = date.today() - timedelta(days=200)
        _add_hours(session, tenant.id, emp.id, old, 50, TimeEntrySource.SHIFT)

        res = metrics_service.get_overtime_ratio(session, tenant.id, ADMIN)
        assert res.ordinary_hours == 0.0  # default 30-day window excludes it

    def test_non_admin_forbidden(self, session, tenant):
        with pytest.raises(ForbiddenError):
            metrics_service.get_overtime_ratio(session, tenant.id, {"role": "Moderador"})


class TestOvertimeRanking:
    def test_orders_desc_and_limits(self, session, tenant):
        today = date.today()
        e1 = _make_employee(session, tenant.id, first="Ana")
        e2 = _make_employee(session, tenant.id, first="Luis")
        e3 = _make_employee(session, tenant.id, first="Marta")
        _add_hours(session, tenant.id, e1.id, today, 5, TimeEntrySource.EXTRA)
        _add_hours(session, tenant.id, e2.id, today, 20, TimeEntrySource.EXTRA)
        _add_hours(session, tenant.id, e3.id, today, 12, TimeEntrySource.EXTRA)

        res = metrics_service.get_overtime_ranking(session, tenant.id, ADMIN, limit=2)
        assert [i.employee_name for i in res.items] == ["Luis Ruiz", "Marta Ruiz"]
        assert res.items[0].extra_hours == 20.0

    def test_excludes_employees_without_extra(self, session, tenant):
        today = date.today()
        e1 = _make_employee(session, tenant.id, first="Ana")
        _make_employee(session, tenant.id, first="Sin")  # only ordinary hours
        _add_hours(session, tenant.id, e1.id, today, 3, TimeEntrySource.EXTRA)

        res = metrics_service.get_overtime_ranking(session, tenant.id, ADMIN)
        assert len(res.items) == 1
        assert res.items[0].employee_name == "Ana Ruiz"

    def test_empty_when_no_extra(self, session, tenant):
        res = metrics_service.get_overtime_ranking(session, tenant.id, ADMIN)
        assert res.items == []

    def test_non_admin_forbidden(self, session, tenant):
        with pytest.raises(ForbiddenError):
            metrics_service.get_overtime_ranking(session, tenant.id, {"role": "Empleado"})

    def test_deterministic_tiebreak_on_equal_hours(self, session, tenant):
        """Issue #53: employees tied on total extra hours must always sort the
        same way (by employee_id) instead of relying on undefined SQL order."""
        today = date.today()
        e1 = _make_employee(session, tenant.id, first="Ana")
        e2 = _make_employee(session, tenant.id, first="Luis")
        e3 = _make_employee(session, tenant.id, first="Marta")
        for emp in (e1, e2, e3):
            _add_hours(session, tenant.id, emp.id, today, 10, TimeEntrySource.EXTRA)

        expected_order = sorted([e1.id, e2.id, e3.id])

        for _ in range(3):
            res = metrics_service.get_overtime_ranking(session, tenant.id, ADMIN, limit=2)
            assert [i.employee_id for i in res.items] == expected_order[:2]


class TestAbsenteeism:
    def _add_absence(self, session, tenant_id, employee_id, day, justified):
        session.add(
            Absence(tenant_id=tenant_id, employee_id=employee_id, date=day, justified=justified)
        )
        session.commit()

    def _add_shift(self, session, tenant_id, employee_id, day):
        session.add(ShiftRecord(tenant_id=tenant_id, employee_id=employee_id, date=day))
        session.commit()

    def test_rate_and_breakdown(self, session, tenant):
        emp = _make_employee(session, tenant.id)
        today = date.today()
        for i in range(200):
            self._add_shift(session, tenant.id, emp.id, today - timedelta(days=i % 25))
        # 6 absences → 3% (no alert)
        for i in range(4):
            self._add_absence(session, tenant.id, emp.id, today - timedelta(days=i), justified=True)
        for i in range(4, 6):
            self._add_absence(session, tenant.id, emp.id, today - timedelta(days=i), justified=False)

        res = metrics_service.get_absenteeism(session, tenant.id, ADMIN)
        assert res.total_absences == 6
        assert res.justified_absences == 4
        assert res.unjustified_absences == 2
        assert res.planned_shifts == 200
        assert res.rate_pct == 3.0
        assert res.alert is False

    def test_alert_above_threshold(self, session, tenant):
        emp = _make_employee(session, tenant.id)
        today = date.today()
        for i in range(100):
            self._add_shift(session, tenant.id, emp.id, today - timedelta(days=i % 25))
        for i in range(6):
            self._add_absence(session, tenant.id, emp.id, today - timedelta(days=i), justified=False)

        res = metrics_service.get_absenteeism(session, tenant.id, ADMIN)
        assert res.rate_pct == 6.0
        assert res.alert is True

    def test_zero_when_no_planned_shifts(self, session, tenant):
        res = metrics_service.get_absenteeism(session, tenant.id, ADMIN)
        assert res.planned_shifts == 0
        assert res.rate_pct == 0.0
        assert res.alert is False

    def test_non_admin_forbidden(self, session, tenant):
        with pytest.raises(ForbiddenError):
            metrics_service.get_absenteeism(session, tenant.id, {"role": "Moderador"})

    def test_future_date_to_does_not_dilute_rate(self, session, tenant):
        """Issue #49: shifts planned beyond today must not inflate the
        denominator and dilute the absenteeism rate."""
        emp = _make_employee(session, tenant.id)
        today = date.today()
        # 10 past shifts, all absent -> 100% if future shifts are excluded.
        for i in range(10):
            self._add_shift(session, tenant.id, emp.id, today - timedelta(days=i))
            self._add_absence(session, tenant.id, emp.id, today - timedelta(days=i), justified=False)
        # Future planned shifts (no absences possible yet) must be ignored.
        for i in range(1, 91):
            self._add_shift(session, tenant.id, emp.id, today + timedelta(days=i))

        res = metrics_service.get_absenteeism(
            session, tenant.id, ADMIN, date_from=today - timedelta(days=30), date_to=today + timedelta(days=90)
        )
        assert res.planned_shifts == 10
        assert res.rate_pct == 100.0


class TestVacationLiability:
    def _set_balance(self, session, tenant_id, employee_id, year, total, used):
        session.add(
            VacationBalance(
                tenant_id=tenant_id,
                employee_id=employee_id,
                year=year,
                total_days=total,
                used_days=used,
            )
        )
        session.commit()

    def test_prorated_for_prior_hire(self, session, tenant):
        year = date.today().year
        emp = _make_employee(session, tenant.id, hire=date(year - 2, 3, 1))
        self._set_balance(session, tenant.id, emp.id, year, total=30, used=5)

        res = metrics_service.get_vacation_liability(session, tenant.id, ADMIN, year=year)
        item = res.items[0]
        expected_accrued = round(30 * date.today().month / 12)
        assert item.months_worked == date.today().month
        assert item.accrued_days == expected_accrued
        assert item.liability_days == expected_accrued - 5

    def test_prorated_for_mid_year_hire(self, session, tenant):
        year = date.today().year
        # Hired this year; months_worked counts from hire month
        emp = _make_employee(session, tenant.id, hire=date(year, 1, 10))
        self._set_balance(session, tenant.id, emp.id, year, total=24, used=0)

        res = metrics_service.get_vacation_liability(session, tenant.id, ADMIN, year=year)
        assert res.items[0].months_worked == date.today().month  # Jan hire, so 1..current

    def test_negative_liability_on_advance(self, session, tenant):
        year = date.today().year
        emp = _make_employee(session, tenant.id, hire=date(year - 1, 6, 1))
        # Used more than accrued to date
        self._set_balance(session, tenant.id, emp.id, year, total=12, used=30)

        res = metrics_service.get_vacation_liability(session, tenant.id, ADMIN, year=year)
        assert res.items[0].liability_days < 0

    def test_totals_and_active_only(self, session, tenant):
        year = date.today().year
        e1 = _make_employee(session, tenant.id, first="Ana", hire=date(year - 1, 1, 1))
        _make_employee(session, tenant.id, first="Ghost", active=False)
        self._set_balance(session, tenant.id, e1.id, year, total=12, used=2)

        res = metrics_service.get_vacation_liability(session, tenant.id, ADMIN, year=year)
        assert len(res.items) == 1  # inactive excluded
        assert res.total_used == 2
        assert res.total_accrued == res.items[0].accrued_days
        assert res.total_liability == res.items[0].liability_days

    def test_empty_without_active_employees(self, session, tenant):
        res = metrics_service.get_vacation_liability(session, tenant.id, ADMIN)
        assert res.items == []
        assert res.total_liability == 0

    def test_includes_departed_employees_for_past_year(self, session, tenant):
        """Issue #46: a past-year report must not silently drop ex-employees."""
        past_year = date.today().year - 1
        emp = _make_employee(
            session, tenant.id, first="Renunciado", hire=date(past_year - 1, 1, 1), active=False
        )
        self._set_balance(session, tenant.id, emp.id, past_year, total=30, used=10)

        res = metrics_service.get_vacation_liability(session, tenant.id, ADMIN, year=past_year)
        assert len(res.items) == 1
        assert res.items[0].employee_name == "Renunciado Ruiz"

    def test_excludes_employees_hired_after_past_year(self, session, tenant):
        past_year = date.today().year - 1
        _make_employee(session, tenant.id, first="Futuro", hire=date(past_year + 1, 1, 1))

        res = metrics_service.get_vacation_liability(session, tenant.id, ADMIN, year=past_year)
        assert res.items == []

    def test_current_year_still_excludes_inactive(self, session, tenant):
        """Current-year behavior is unchanged: only currently-active employees count."""
        year = date.today().year
        _make_employee(session, tenant.id, first="Ghost", hire=date(year - 2, 1, 1), active=False)

        res = metrics_service.get_vacation_liability(session, tenant.id, ADMIN, year=year)
        assert res.items == []

    def test_non_admin_forbidden(self, session, tenant):
        with pytest.raises(ForbiddenError):
            metrics_service.get_vacation_liability(session, tenant.id, {"role": "Empleado"})

    def test_half_day_tie_rounds_up(self, session, tenant, monkeypatch):
        """Issue #48: round(10.5) with Python's native banker's rounding gives
        10, not 11. Accrual must round half-day ties up. 18 annual days,
        hired the prior year, 7 months worked this year -> 18*7/12 = 10.5,
        must accrue 11, not 10."""

        class FrozenDate(date):
            @classmethod
            def today(cls):
                return date(2026, 7, 15)

        monkeypatch.setattr(metrics_service, "date", FrozenDate)

        year = 2026
        emp = _make_employee(session, tenant.id, hire=date(year - 1, 1, 1))
        # custom_vacation_days must match the balance's total_days: otherwise
        # get_or_create_balances_bulk "self-heals" total_days back to the
        # tenant/employee default on every read, silently discarding it.
        emp.custom_vacation_days = 18
        session.add(emp)
        session.commit()
        self._set_balance(session, tenant.id, emp.id, year, total=18, used=0)

        res = metrics_service.get_vacation_liability(session, tenant.id, ADMIN, year=year)
        assert res.items[0].months_worked == 7
        assert res.items[0].accrued_days == 11
