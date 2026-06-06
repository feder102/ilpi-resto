"""T009: Moderator Service - Department scoping and utilities.

Feature 006: Moderator Portal

Provides shared utilities for department-scoped access control:
- get_moderator_department(): Extract department from JWT
- enforce_department_scope(): Verify access to employee/request

All moderator endpoints use these utilities to prevent cross-department access.
"""

import uuid
from datetime import date as date_type

from sqlmodel import Session, select

from app.common.exceptions import ForbiddenError, NotFoundError, UnauthorizedError
from app.models import Employee
from app.models.time_entry import TimeEntry
from app.models.vacation_balance import VacationBalance
from app.models.vacation_request import VacationRequest


def get_moderator_department(current_user: dict, session: Session) -> str:
    """
    Extract moderator's department from JWT employee_id.

    Used by all moderator endpoints to scope queries to their department.

    Args:
        current_user: JWT payload with employee_id
        session: Database session

    Returns:
        Department name (e.g., 'Cocina', 'Barra')

    Raises:
        ValueError: If employee_id not in JWT or employee record not found
    """
    employee_id = current_user.get("employee_id")
    if not employee_id:
        raise UnauthorizedError("JWT missing employee_id - moderator identity cannot be determined")

    # Coerce to UUID for DB backends that require typed UUIDs (e.g. SQLite)
    if isinstance(employee_id, str):
        employee_id = uuid.UUID(employee_id)

    # Fetch employee record to get department
    statement = select(Employee).where(Employee.id == employee_id)
    employee = session.exec(statement).first()

    if not employee:
        raise NotFoundError(f"Employee record not found for ID: {employee_id}")

    return employee.department


def enforce_department_scope(
    target_employee_id: str,
    moderator_employee_id: str,
    session: Session
) -> bool:
    """
    Verify that target employee belongs to moderator's department.

    Used by shift assignment and vacation approval endpoints.

    Args:
        target_employee_id: Employee being modified
        moderator_employee_id: Moderator performing action
        session: Database session

    Returns:
        True if in same department

    Raises:
        PermissionError: If employee not in moderator's department
    """
    # Get both employees
    target_stmt = select(Employee).where(Employee.id == target_employee_id)
    target = session.exec(target_stmt).first()

    moderator_stmt = select(Employee).where(Employee.id == moderator_employee_id)
    moderator = session.exec(moderator_stmt).first()

    if not target or not moderator:
        raise NotFoundError("Employee record(s) not found")

    # Verify same department
    if target.department != moderator.department:
        raise ForbiddenError(
            f"Cannot access employee in {target.department}. "
            f"You are authorized for {moderator.department} only."
        )

    return True


def get_department_name(employee_id: str, session: Session) -> str | None:
    """
    Convenience method to get department name for any employee.

    Args:
        employee_id: Employee ID
        session: Database session

    Returns:
        Department name or None if not found
    """
    statement = select(Employee).where(Employee.id == employee_id)
    employee = session.exec(statement).first()
    return employee.department if employee else None


def get_attendance_report(
    current_user: dict,
    session: Session,
    date_from: str,
    date_to: str,
) -> dict:
    """Build the attendance report for the moderator's department (T074).

    Aggregates TimeEntry records (automatic time tracking) for all employees in
    the moderator's department within the date range.
    """
    department = get_moderator_department(current_user, session)
    tenant_id = current_user.get("tenant_id")
    if isinstance(tenant_id, str):
        tenant_id = uuid.UUID(tenant_id)

    start = date_type.fromisoformat(date_from)
    end = date_type.fromisoformat(date_to)

    employees = session.exec(
        select(Employee).where(
            Employee.tenant_id == tenant_id,
            Employee.department == department,
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
        "department": department,
        "records": records,
    }


def get_vacation_summary(
    current_user: dict,
    session: Session,
    year: int,
    status: str | None = None,
) -> dict:
    """Build the vacation summary for the moderator's department (T072).

    Aggregates vacation request days by status per employee for the given year,
    plus the current remaining balance.
    """
    department = get_moderator_department(current_user, session)
    tenant_id = current_user.get("tenant_id")
    if isinstance(tenant_id, str):
        tenant_id = uuid.UUID(tenant_id)

    employees = session.exec(
        select(Employee).where(
            Employee.tenant_id == tenant_id,
            Employee.department == department,
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

        # status filter only affects which rows are listed (totals stay department-wide)
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
        "department": department,
        "summary": summary,
        "department_total": totals,
    }
