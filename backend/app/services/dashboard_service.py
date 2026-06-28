"""T020: Dashboard service — department string → FK (Feature 014)."""

import uuid
from datetime import date, timedelta

from sqlmodel import Session, func, select

from app.models.department import Department
from app.models.employee import Employee
from app.models.time_entry import TimeEntry
from app.models.vacation_request import VacationRequest


def get_stats(tenant_id: uuid.UUID, session: Session) -> dict:
    today = date.today()

    total_employees = session.exec(
        select(func.count()).select_from(
            select(Employee)
            .where(Employee.tenant_id == tenant_id, Employee.is_active == True)  # noqa: E712
            .subquery()
        )
    ).one()

    on_shift = session.exec(
        select(func.count(func.distinct(TimeEntry.employee_id))).where(
            TimeEntry.tenant_id == tenant_id,
            TimeEntry.shift_date == today,
        )
    ).one()

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
    department_id: uuid.UUID | None = None,
) -> list[dict]:
    if date_to is None:
        date_to = date.today()
    if date_from is None:
        date_from = date_to - timedelta(days=30)

    query = select(TimeEntry).where(
        TimeEntry.tenant_id == tenant_id,
        TimeEntry.shift_date >= date_from,
        TimeEntry.shift_date <= date_to,
    )

    if department_id is not None:
        query = query.join(Employee, Employee.id == TimeEntry.employee_id).where(
            Employee.department_id == department_id
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
    department_id: uuid.UUID | None = None,
) -> list[dict]:
    """Active employee count by department with department details."""
    query = (
        select(Employee.department_id, func.count())
        .where(Employee.tenant_id == tenant_id, Employee.is_active == True)  # noqa: E712
        .group_by(Employee.department_id)
    )
    if department_id is not None:
        query = query.where(Employee.department_id == department_id)

    results = session.exec(query).all()

    output = []
    for dept_id, count in results:
        dept = session.get(Department, dept_id)
        dept_name = dept.name if dept else "Desconocido"
        output.append({"department": dept_name, "department_id": str(dept_id), "count": count})

    return output
