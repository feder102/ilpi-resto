"""T009: Moderator Service - Department scoping and utilities.

Feature 006: Moderator Portal

Provides shared utilities for department-scoped access control:
- get_moderator_department(): Extract department from JWT
- enforce_department_scope(): Verify access to employee/request

All moderator endpoints use these utilities to prevent cross-department access.
"""

from typing import Optional
from sqlmodel import Session, select
from app.models import Employee
from app.common.exceptions import UnauthorizedError, ForbiddenError, NotFoundError


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


def get_department_name(employee_id: str, session: Session) -> Optional[str]:
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
