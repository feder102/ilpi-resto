"""T017: Moderator Service — department string → FK (Feature 014).

Provides shared utilities for department-scoped access control:
- get_moderator_department(): Extract department from JWT
- enforce_department_scope(): Verify access to employee/request
"""

import uuid
from datetime import date as date_type

from sqlmodel import Session, select

from app.common.exceptions import ForbiddenError, NotFoundError, UnauthorizedError
from app.models import Employee
from app.models.department import Department
from app.models.time_entry import TimeEntry
from app.models.vacation_balance import VacationBalance
from app.models.vacation_request import VacationRequest


def get_moderator_department(current_user: dict, session: Session) -> Department:
    """Extract moderator's Department object from JWT employee_id."""
    employee_id = current_user.get("employee_id")
    if not employee_id:
        raise UnauthorizedError("JWT missing employee_id - moderator identity cannot be determined")

    if isinstance(employee_id, str):
        employee_id = uuid.UUID(employee_id)

    employee = session.exec(select(Employee).where(Employee.id == employee_id)).first()
    if not employee:
        raise NotFoundError(f"Employee record not found for ID: {employee_id}")

    dept = session.get(Department, employee.department_id)
    if not dept:
        raise NotFoundError("Departamento del moderador no encontrado")

    return dept


def enforce_department_scope(
    target_employee_id: str,
    moderator_employee_id: str,
    session: Session,
) -> bool:
    """Verify that target employee belongs to moderator's department."""
    target_stmt = select(Employee).where(Employee.id == target_employee_id)
    target = session.exec(target_stmt).first()

    moderator_stmt = select(Employee).where(Employee.id == moderator_employee_id)
    moderator = session.exec(moderator_stmt).first()

    if not target or not moderator:
        raise NotFoundError("Employee record(s) not found")

    if target.department_id != moderator.department_id:
        target_dept = session.get(Department, target.department_id)
        mod_dept = session.get(Department, moderator.department_id)
        target_name = target_dept.name if target_dept else "Desconocido"
        mod_name = mod_dept.name if mod_dept else "Desconocido"
        raise ForbiddenError(
            f"Cannot access employee in {target_name}. "
            f"You are authorized for {mod_name} only."
        )

    return True


def get_department_name(employee_id: str, session: Session) -> str | None:
    """Return department name for any employee."""
    employee = session.exec(select(Employee).where(Employee.id == employee_id)).first()
    if not employee:
        return None
    dept = session.get(Department, employee.department_id)
    return dept.name if dept else None


def get_attendance_report(
    current_user: dict,
    session: Session,
    date_from: str,
    date_to: str,
) -> dict:
    """Build the attendance report for the moderator's department."""
    dept = get_moderator_department(current_user, session)
    tenant_id = current_user.get("tenant_id")
    if isinstance(tenant_id, str):
        tenant_id = uuid.UUID(tenant_id)

    start = date_type.fromisoformat(date_from)
    end = date_type.fromisoformat(date_to)

    employees = session.exec(
        select(Employee).where(
            Employee.tenant_id == tenant_id,
            Employee.department_id == dept.id,
        )
    ).all()
    emp_by_id = {e.id: e for e in employees}

    if emp_by_id:
        entries = session.exec(
            select(TimeEntry)
            .where(
                TimeEntry.tenant_id == tenant_id,
                TimeEntry.employee_id.in_(list(emp_by_id.keys())),  # type: ignore[attr-defined]
                TimeEntry.shift_date >= start,
                TimeEntry.shift_date <= end,
            )
            .order_by(TimeEntry.shift_date)
        ).all()
    else:
        entries = []

    records = []
    for entry in entries:
        emp = emp_by_id.get(entry.employee_id)
        name = f"{emp.first_name} {emp.last_name}" if emp else ""
        records.append({
            "employee_id": str(entry.employee_id),
            "employee_name": name,
            "date": entry.shift_date.isoformat(),
            "clock_in": entry.start_time.strftime("%H:%M") if entry.start_time else None,
            "clock_out": entry.end_time.strftime("%H:%M") if entry.end_time else None,
            "hours_worked": float(entry.hours_worked) if entry.hours_worked is not None else None,
            "shift_type": entry.shift_type.name if entry.shift_type else "",
        })

    return {
        "date_from": date_from,
        "date_to": date_to,
        "department": dept.name,
        "records": records,
    }


def get_vacation_summary(
    current_user: dict,
    session: Session,
    year: int,
    status: str | None = None,
) -> dict:
    """Build the vacation summary for the moderator's department."""
    dept = get_moderator_department(current_user, session)
    tenant_id = current_user.get("tenant_id")
    if isinstance(tenant_id, str):
        tenant_id = uuid.UUID(tenant_id)

    employees = session.exec(
        select(Employee).where(
            Employee.tenant_id == tenant_id,
            Employee.department_id == dept.id,
        )
    ).all()

    year_start = date_type(year, 1, 1)
    year_end = date_type(year, 12, 31)

    summary = []
    totals = {"approved_days": 0, "rejected_days": 0, "pending_days": 0}

    for emp in employees:
        requests = session.exec(
            select(VacationRequest).where(
                VacationRequest.tenant_id == tenant_id,
                VacationRequest.employee_id == emp.id,
                VacationRequest.start_date >= year_start,
                VacationRequest.start_date <= year_end,
            )
        ).all()

        approved = sum(r.requested_days for r in requests if r.status == "Aprobado")
        rejected = sum(r.requested_days for r in requests if r.status == "Rechazado")
        pending = sum(r.requested_days for r in requests if r.status == "Pendiente")

        balance = session.exec(
            select(VacationBalance).where(
                VacationBalance.tenant_id == tenant_id,
                VacationBalance.employee_id == emp.id,
                VacationBalance.year == year,
            )
        ).first()
        remaining = (balance.total_days - balance.used_days) if balance else 30

        if status is None or (
            (status == "Aprobado" and approved > 0)
            or (status == "Rechazado" and rejected > 0)
            or (status == "Pendiente" and pending > 0)
        ):
            summary.append({
                "employee_id": str(emp.id),
                "employee_name": f"{emp.first_name} {emp.last_name}",
                "approved_days": approved,
                "rejected_days": rejected,
                "pending_days": pending,
                "remaining_days": remaining,
            })

        totals["approved_days"] += approved
        totals["rejected_days"] += rejected
        totals["pending_days"] += pending

    return {
        "year": year,
        "department": dept.name,
        "summary": summary,
        "department_total": totals,
    }
