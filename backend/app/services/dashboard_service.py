"""T073: Dashboard service for aggregated stats."""

import uuid
from datetime import date, timedelta

from sqlmodel import Session, func, select

from app.models.employee import Employee
from app.models.time_entry import TimeEntry
from app.models.vacation_request import VacationRequest


def get_stats(tenant_id: uuid.UUID, session: Session) -> dict:
    today = date.today()

    # Total active employees
    total_employees = session.exec(
        select(func.count()).select_from(
            select(Employee)
            .where(Employee.tenant_id == tenant_id, Employee.is_active == True)  # noqa: E712
            .subquery()
        )
    ).one()

    # Currently on shift today (distinct employees with a TimeEntry for today)
    on_shift = session.exec(
        select(func.count(func.distinct(TimeEntry.employee_id))).where(
            TimeEntry.tenant_id == tenant_id,
            TimeEntry.shift_date == today,
        )
    ).one()

    # On vacation (approved, covering today)
    on_vacation = session.exec(
        select(func.count()).select_from(
            select(VacationRequest)
            .where(
                VacationRequest.tenant_id == tenant_id,
                VacationRequest.status == "Aprobado",
                VacationRequest.start_date <= today,
                VacationRequest.end_date >= today,
            )
            .subquery()
        )
    ).one()

    # Pending vacation requests
    pending_requests = session.exec(
        select(func.count()).select_from(
            select(VacationRequest)
            .where(
                VacationRequest.tenant_id == tenant_id,
                VacationRequest.status == "Pendiente",
            )
            .subquery()
        )
    ).one()

    return {
        "total_employees": total_employees,
        "on_shift": on_shift,
        "on_vacation": on_vacation,
        "pending_requests": pending_requests,
    }


def get_hours_by_day(
    tenant_id: uuid.UUID,
    session: Session,
    date_from: date | None = None,
    date_to: date | None = None,
    department: str | None = None,
) -> list[dict]:
    """Aggregate worked hours by day of week from TimeEntry (automatic time tracking).

    Args:
        tenant_id: Tenant scope.
        session: DB session.
        date_from: Start of range (inclusive). Defaults to 30 days before date_to.
        date_to: End of range (inclusive). Defaults to today.
        department: Optional department filter (for moderator-scoped reports).

    Returns:
        List of {"day": <weekday name>, "hours": <float>} for the 7 weekdays.
    """
    if date_to is None:
        date_to = date.today()
    if date_from is None:
        date_from = date_to - timedelta(days=30)

    query = select(TimeEntry).where(
        TimeEntry.tenant_id == tenant_id,
        TimeEntry.shift_date >= date_from,
        TimeEntry.shift_date <= date_to,
    )

    if department is not None:
        query = query.join(Employee, Employee.id == TimeEntry.employee_id).where(
            Employee.department == department
        )

    entries = session.exec(query).all()

    day_names = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
    day_hours: dict[str, float] = {name: 0.0 for name in day_names}

    for entry in entries:
        day_name = day_names[entry.shift_date.weekday()]
        day_hours[day_name] += float(entry.hours_worked)

    return [{"day": day, "hours": round(hours, 1)} for day, hours in day_hours.items()]


def get_department_distribution(
    tenant_id: uuid.UUID,
    session: Session,
    department: str | None = None,
) -> list[dict]:
    """Active employee count by department.

    Args:
        tenant_id: Tenant scope.
        session: DB session.
        department: Optional filter to a single department (for moderator-scoped reports).
    """
    query = (
        select(Employee.department, func.count())
        .where(Employee.tenant_id == tenant_id, Employee.is_active == True)  # noqa: E712
        .group_by(Employee.department)
    )
    if department is not None:
        query = query.where(Employee.department == department)

    results = session.exec(query).all()

    return [{"department": dept, "count": count} for dept, count in results]
