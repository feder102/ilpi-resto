"""Personnel metrics service (Feature 015).

Read-only aggregations for the Admin-only reports section: overtime ratio,
absenteeism rate, overtime ranking and accrued vacation liability.

RBAC is enforced here (service layer) in addition to the router, per the
project constitution (Principle V): every public function calls
``_require_admin`` before touching data. All queries are scoped by
``tenant_id``.
"""

import uuid
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal

from sqlmodel import Session, func, select

from app.common.exceptions import ForbiddenError
from app.models.absence import Absence
from app.models.employee import Employee
from app.models.shift_record import ShiftRecord
from app.models.time_entry import TimeEntry, TimeEntrySource
from app.schemas.metrics import (
    AbsenteeismResponse,
    OvertimeRankingItem,
    OvertimeRankingResponse,
    OvertimeRatioResponse,
    VacationLiabilityItem,
    VacationLiabilityResponse,
)
from app.services.vacation_service import get_or_create_balances_bulk

#: Absenteeism rate (percentage) above which the UI raises a visual alert.
ABSENTEEISM_ALERT_THRESHOLD: float = 5.0

#: Default number of employees returned by the overtime ranking.
DEFAULT_RANKING_LIMIT: int = 10

#: Default look-back window (days) when no explicit range is provided.
DEFAULT_WINDOW_DAYS: int = 30


def _require_admin(current_user: dict) -> None:
    """Raise ForbiddenError unless the current user is an Admin."""
    if current_user.get("role") != "Admin":
        raise ForbiddenError("Solo administradores pueden ver estas métricas")


def _period_defaults(date_from: date | None, date_to: date | None) -> tuple[date, date]:
    """Resolve the reporting window, defaulting to the last 30 days."""
    resolved_to = date_to if date_to is not None else date.today()
    resolved_from = (
        date_from if date_from is not None else resolved_to - timedelta(days=DEFAULT_WINDOW_DAYS)
    )
    return resolved_from, resolved_to


def _months_worked(hire_date: date, year: int, today: date) -> int:
    """Months worked within ``year`` up to today (proportional accrual base).

    - Hired before ``year``: counts from January.
    - Hired during ``year``: counts from the hire month.
    - Hired in a future year, or ``year`` in the future: 0.
    """
    if hire_date.year > year or year > today.year:
        return 0
    end_month = today.month if year == today.year else 12
    start_month = hire_date.month if hire_date.year == year else 1
    return max(0, end_month - start_month + 1)


def _sum_hours(
    session: Session,
    tenant_id: uuid.UUID,
    date_from: date,
    date_to: date,
    source: TimeEntrySource,
) -> Decimal:
    """Sum ``hours_worked`` for a given source within the period."""
    total = session.exec(
        select(func.coalesce(func.sum(TimeEntry.hours_worked), 0)).where(
            TimeEntry.tenant_id == tenant_id,
            TimeEntry.shift_date >= date_from,
            TimeEntry.shift_date <= date_to,
            TimeEntry.source == source,
        )
    ).one()
    return Decimal(str(total))


def get_overtime_ratio(
    session: Session,
    tenant_id: uuid.UUID,
    current_user: dict,
    date_from: date | None = None,
    date_to: date | None = None,
) -> OvertimeRatioResponse:
    """Ratio of extra hours to ordinary hours for the period (as a percentage)."""
    _require_admin(current_user)
    date_from, date_to = _period_defaults(date_from, date_to)

    ordinary = _sum_hours(session, tenant_id, date_from, date_to, TimeEntrySource.SHIFT)
    extra = _sum_hours(session, tenant_id, date_from, date_to, TimeEntrySource.EXTRA)

    ratio_pct = round(float(extra / ordinary * 100), 2) if ordinary > 0 else None

    return OvertimeRatioResponse(
        date_from=date_from,
        date_to=date_to,
        ordinary_hours=float(ordinary),
        extra_hours=float(extra),
        ratio_pct=ratio_pct,
    )


def get_overtime_ranking(
    session: Session,
    tenant_id: uuid.UUID,
    current_user: dict,
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = DEFAULT_RANKING_LIMIT,
) -> OvertimeRankingResponse:
    """Top ``limit`` employees by extra hours in the period, descending."""
    _require_admin(current_user)
    date_from, date_to = _period_defaults(date_from, date_to)

    total_extra = func.coalesce(func.sum(TimeEntry.hours_worked), 0)
    rows = session.exec(
        select(Employee.id, Employee.first_name, Employee.last_name, total_extra)
        .join(TimeEntry, TimeEntry.employee_id == Employee.id)
        .where(
            Employee.tenant_id == tenant_id,
            TimeEntry.tenant_id == tenant_id,
            TimeEntry.source == TimeEntrySource.EXTRA,
            TimeEntry.shift_date >= date_from,
            TimeEntry.shift_date <= date_to,
        )
        .group_by(Employee.id, Employee.first_name, Employee.last_name)
        .order_by(total_extra.desc(), Employee.id)
        .limit(limit)
    ).all()

    items = [
        OvertimeRankingItem(
            employee_id=row[0],
            employee_name=f"{row[1]} {row[2]}",
            extra_hours=float(row[3]),
        )
        for row in rows
    ]
    return OvertimeRankingResponse(date_from=date_from, date_to=date_to, items=items)


def get_absenteeism(
    session: Session,
    tenant_id: uuid.UUID,
    current_user: dict,
    date_from: date | None = None,
    date_to: date | None = None,
) -> AbsenteeismResponse:
    """Absenteeism rate for the period with justified/unjustified breakdown."""
    _require_admin(current_user)
    date_from, date_to = _period_defaults(date_from, date_to)

    total_absences = session.exec(
        select(func.count())
        .select_from(Absence)
        .where(
            Absence.tenant_id == tenant_id,
            Absence.date >= date_from,
            Absence.date <= date_to,
        )
    ).one()
    justified_absences = session.exec(
        select(func.count())
        .select_from(Absence)
        .where(
            Absence.tenant_id == tenant_id,
            Absence.date >= date_from,
            Absence.date <= date_to,
            Absence.justified == True,  # noqa: E712
        )
    ).one()
    # A caller may request a date_to in the future (e.g. to preview a
    # planned roster); cap it at today so future shifts don't inflate the
    # denominator and dilute the absenteeism rate (issue #49).
    shifts_date_to = min(date_to, date.today())
    planned_shifts = session.exec(
        select(func.count())
        .select_from(ShiftRecord)
        .where(
            ShiftRecord.tenant_id == tenant_id,
            ShiftRecord.date >= date_from,
            ShiftRecord.date <= shifts_date_to,
        )
    ).one()

    rate_pct = round(total_absences / planned_shifts * 100, 2) if planned_shifts > 0 else 0.0

    return AbsenteeismResponse(
        date_from=date_from,
        date_to=date_to,
        total_absences=total_absences,
        justified_absences=justified_absences,
        unjustified_absences=total_absences - justified_absences,
        planned_shifts=planned_shifts,
        rate_pct=rate_pct,
        alert=rate_pct > ABSENTEEISM_ALERT_THRESHOLD,
    )


def get_vacation_liability(
    session: Session,
    tenant_id: uuid.UUID,
    current_user: dict,
    year: int | None = None,
) -> VacationLiabilityResponse:
    """Accrued vacation liability per employee plus staff totals.

    ``accrued = round(annual_days * months_worked / 12)`` and
    ``liability = accrued - used_days``. Reuses the canonical balance resolver
    so ``annual_days`` respects per-employee and tenant defaults.

    For the current year, only currently-active employees are included. For
    past years, employees are included based on ``hire_date`` regardless of
    their current ``is_active`` status, since a departed employee's vacation
    liability for a year they worked is still a real historical figure.
    """
    _require_admin(current_user)
    today = date.today()
    resolved_year = year if year is not None else today.year

    if resolved_year < today.year:
        # Historical report: `is_active` reflects today, not `resolved_year`,
        # so include anyone who had already been hired by the end of that
        # year even if they've since left (issue #46).
        employees = session.exec(
            select(Employee).where(
                Employee.tenant_id == tenant_id,
                Employee.hire_date <= date(resolved_year, 12, 31),
            )
        ).all()
    else:
        employees = session.exec(
            select(Employee).where(
                Employee.tenant_id == tenant_id,
                Employee.is_active == True,  # noqa: E712
            )
        ).all()

    balances_by_employee = get_or_create_balances_bulk(
        list(employees), resolved_year, tenant_id, session
    )

    items: list[VacationLiabilityItem] = []
    total_accrued = 0
    total_used = 0
    total_liability = 0

    for emp in employees:
        balance = balances_by_employee[emp.id]
        annual = balance.total_days
        used = balance.used_days
        months = _months_worked(emp.hire_date, resolved_year, today)
        # Python's round() uses round-half-to-even, which rounds .5 ties down
        # (e.g. round(10.5) == 10). Vacation accrual is an accounting figure,
        # so ties must round up (issue #48).
        accrued = int(
            (Decimal(annual * months) / Decimal(12)).quantize(
                Decimal("1"), rounding=ROUND_HALF_UP
            )
        )
        liability = accrued - used

        items.append(
            VacationLiabilityItem(
                employee_id=emp.id,
                employee_name=f"{emp.first_name} {emp.last_name}",
                annual_days=annual,
                months_worked=months,
                accrued_days=accrued,
                used_days=used,
                liability_days=liability,
            )
        )
        total_accrued += accrued
        total_used += used
        total_liability += liability

    items.sort(key=lambda item: item.liability_days, reverse=True)

    return VacationLiabilityResponse(
        year=resolved_year,
        items=items,
        total_accrued=total_accrued,
        total_used=total_used,
        total_liability=total_liability,
    )
