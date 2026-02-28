"""T073: Dashboard service for aggregated stats."""

import uuid
from datetime import date

from sqlmodel import Session, func, select

from app.models.employee import Employee
from app.models.shift_record import ShiftRecord
from app.models.vacation_request import VacationRequest


def get_stats(tenant_id: uuid.UUID, session: Session) -> dict:
    # Total active employees
    total_employees = session.exec(
        select(func.count()).select_from(
            select(Employee)
            .where(Employee.tenant_id == tenant_id, Employee.is_active == True)  # noqa: E712
            .subquery()
        )
    ).one()

    # Currently on shift (no exit_time)
    on_shift = session.exec(
        select(func.count()).select_from(
            select(ShiftRecord)
            .where(
                ShiftRecord.tenant_id == tenant_id,
                ShiftRecord.exit_time == None,  # noqa: E711
            )
            .subquery()
        )
    ).one()

    # On vacation (approved, covering today)
    today = date.today()
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


def get_hours_by_day(tenant_id: uuid.UUID, session: Session) -> list[dict]:
    """Aggregate shift hours by day of week."""
    records = session.exec(
        select(ShiftRecord).where(
            ShiftRecord.tenant_id == tenant_id,
            ShiftRecord.exit_time != None,  # noqa: E711
        )
    ).all()

    day_hours: dict[str, float] = {
        "Lunes": 0, "Martes": 0, "Miércoles": 0, "Jueves": 0,
        "Viernes": 0, "Sábado": 0, "Domingo": 0,
    }
    day_names = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

    for rec in records:
        if rec.exit_time and rec.entry_time:
            hours = (rec.exit_time - rec.entry_time).total_seconds() / 3600
            day_name = day_names[rec.date.weekday()]
            day_hours[day_name] += hours

    return [{"day": day, "hours": round(h, 1)} for day, h in day_hours.items()]


def get_department_distribution(tenant_id: uuid.UUID, session: Session) -> list[dict]:
    """Employee count by department."""
    results = session.exec(
        select(Employee.department, func.count())
        .where(Employee.tenant_id == tenant_id, Employee.is_active == True)  # noqa: E712
        .group_by(Employee.department)
    ).all()

    return [{"department": dept, "count": count} for dept, count in results]
