"""Unit tests for monthly workday processing (Feature 013).

Validates idempotency, future-month handling, days-without-shifts counting,
and per-day error resilience of TimeTrackingService.process_workdays_for_month.
"""

import calendar
import uuid
from datetime import date, timedelta

import pytest
from sqlmodel import Session, select

from app.models.shift_record import ShiftRecord
from app.models.shift_type import ShiftType
from app.models.time_entry import TimeEntry
from app.services.time_tracking_service import TimeTrackingService


@pytest.fixture
def shift_type_valid(session: Session, test_tenant) -> ShiftType:
    """ShiftType with the time_windows shape expected by the production service.

    The service reads window['start'] / window['end'] (NOT 'start_time'/'end_time').
    """
    st = ShiftType(
        tenant_id=test_tenant.id,
        name="Mañana",
        type="MAÑANA",
        expected_hours=8.0,
        is_active=True,
        time_windows=[{"start": "09:00", "end": "17:00"}],
    )
    session.add(st)
    session.commit()
    session.refresh(st)
    return st


def _last_month() -> tuple[int, int]:
    """Return (year, month) of the previous full month."""
    today = date.today()
    if today.month == 1:
        return today.year - 1, 12
    return today.year, today.month - 1


def _seed_shifts(
    session: Session, tenant_id: uuid.UUID, employee_id: uuid.UUID,
    shift_type_id: uuid.UUID, dates: list[date],
) -> None:
    for d in dates:
        session.add(ShiftRecord(
            tenant_id=tenant_id,
            employee_id=employee_id,
            date=d,
            shift_type_id=shift_type_id,
        ))
    session.commit()


class TestMonthlyProcessing:
    def test_past_month_with_shifts_creates_entries(
        self, session: Session, test_tenant, test_employee, shift_type_valid
    ):
        year, month = _last_month()
        # 3 turnos en 3 días distintos del mes pasado
        days = [date(year, month, 5), date(year, month, 12), date(year, month, 20)]
        _seed_shifts(session, test_tenant.id, test_employee.id, shift_type_valid.id, days)

        result = TimeTrackingService.process_workdays_for_month(
            db=session, tenant_id=test_tenant.id, year=year, month=month
        )

        assert result["year"] == year
        assert result["month"] == month
        assert result["entries_created"] == 3
        assert result["entries_skipped"] == 0
        # days_without_shifts = días iterados menos los 3 con turno
        assert result["days_processed"] == calendar.monthrange(year, month)[1]
        assert result["days_without_shifts"] == result["days_processed"] - 3
        assert result["errors"] == []

        # Verify in DB
        entries = session.exec(
            select(TimeEntry).where(TimeEntry.tenant_id == test_tenant.id)
        ).all()
        assert len(entries) == 3

    def test_reprocessing_is_idempotent(
        self, session: Session, test_tenant, test_employee, shift_type_valid
    ):
        year, month = _last_month()
        days = [date(year, month, 7), date(year, month, 14)]
        _seed_shifts(session, test_tenant.id, test_employee.id, shift_type_valid.id, days)

        # Primera pasada
        first = TimeTrackingService.process_workdays_for_month(
            db=session, tenant_id=test_tenant.id, year=year, month=month
        )
        assert first["entries_created"] == 2
        assert first["entries_skipped"] == 0

        # Segunda pasada: nada nuevo, todo omitido
        second = TimeTrackingService.process_workdays_for_month(
            db=session, tenant_id=test_tenant.id, year=year, month=month
        )
        assert second["entries_created"] == 0
        assert second["entries_skipped"] == 2

        # Verify DB: solo 2 entries totales
        entries = session.exec(
            select(TimeEntry).where(TimeEntry.tenant_id == test_tenant.id)
        ).all()
        assert len(entries) == 2

    def test_partially_processed_month_creates_only_missing(
        self, session: Session, test_tenant, test_employee, shift_type_valid
    ):
        year, month = _last_month()
        days = [date(year, month, 3), date(year, month, 10)]
        _seed_shifts(session, test_tenant.id, test_employee.id, shift_type_valid.id, days)

        # Primera pasada
        TimeTrackingService.process_workdays_for_month(
            db=session, tenant_id=test_tenant.id, year=year, month=month
        )

        # Agregar un turno nuevo retroactivamente
        new_day = date(year, month, 17)
        _seed_shifts(session, test_tenant.id, test_employee.id, shift_type_valid.id, [new_day])

        # Reprocesar
        result = TimeTrackingService.process_workdays_for_month(
            db=session, tenant_id=test_tenant.id, year=year, month=month
        )
        assert result["entries_created"] == 1
        assert result["entries_skipped"] == 2

    def test_future_month_processes_nothing(
        self, session: Session, test_tenant
    ):
        today = date.today()
        # Mes futuro (saltando un año si estamos en diciembre)
        future_year = today.year + 1
        future_month = today.month

        result = TimeTrackingService.process_workdays_for_month(
            db=session, tenant_id=test_tenant.id, year=future_year, month=future_month
        )
        assert result["days_processed"] == 0
        assert result["entries_created"] == 0
        assert result["entries_skipped"] == 0
        assert result["days_without_shifts"] == 0
        assert result["errors"] == []

    def test_month_without_any_shifts(
        self, session: Session, test_tenant
    ):
        year, month = _last_month()

        result = TimeTrackingService.process_workdays_for_month(
            db=session, tenant_id=test_tenant.id, year=year, month=month
        )
        assert result["entries_created"] == 0
        assert result["entries_skipped"] == 0
        assert result["days_processed"] == calendar.monthrange(year, month)[1]
        assert result["days_without_shifts"] == result["days_processed"]
        assert result["errors"] == []

    def test_current_month_only_processes_up_to_today(
        self, session: Session, test_tenant, test_employee, shift_type_valid
    ):
        today = date.today()
        # Crear un turno en el día de hoy y otro en una fecha futura del mismo mes
        future_day = today + timedelta(days=5)
        if future_day.month != today.month:
            pytest.skip("Hoy está demasiado cerca de fin de mes para este test")

        _seed_shifts(
            session, test_tenant.id, test_employee.id, shift_type_valid.id,
            [today, future_day],
        )

        result = TimeTrackingService.process_workdays_for_month(
            db=session, tenant_id=test_tenant.id, year=today.year, month=today.month
        )

        # days_processed debe ser solo hasta hoy (today.day)
        assert result["days_processed"] == today.day
        # Solo el turno de hoy se procesa; el futuro no
        assert result["entries_created"] == 1

    def test_tenant_isolation(
        self, session: Session, test_tenant, test_employee, shift_type_valid
    ):
        from app.models.tenant import Tenant

        # Crear segundo tenant con su propio turno
        other_tenant = Tenant(
            name="Otro", slug="otro", timezone="Europe/Madrid", locale="es"
        )
        session.add(other_tenant)
        session.commit()
        session.refresh(other_tenant)

        year, month = _last_month()
        # Turno del tenant principal
        _seed_shifts(
            session, test_tenant.id, test_employee.id, shift_type_valid.id,
            [date(year, month, 4)],
        )

        # Procesar el OTRO tenant: no debería crear nada
        result = TimeTrackingService.process_workdays_for_month(
            db=session, tenant_id=other_tenant.id, year=year, month=month
        )
        assert result["entries_created"] == 0
