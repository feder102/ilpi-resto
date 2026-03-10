"""T010: Moderator Shift Service - Shift management and conflict detection.

Feature 006: Moderator Portal

Provides methods for:
- Roster retrieval with vacation status indicators
- Shift assignment with conflict detection
- Employee filtering by department
"""

from datetime import datetime, date
from typing import Optional, List
from sqlmodel import Session, select, and_, or_
from app.models import (
    Employee,
    ShiftRecord,
    ShiftType,
    VacationRequest,
    VacationBalance,
)
from app.common.exceptions import (
    ConflictError,
    ValidationError,
    NotFoundError,
)


def get_department_employees(department: str, session: Session) -> List[Employee]:
    """
    Get all active employees in moderator's department.

    Used for:
    - Populating employee dropdown in shift assignment form
    - Listing team members for roster

    Args:
        department: Department name (e.g., 'Cocina')
        session: Database session

    Returns:
        List of active employees in department, sorted by name
    """
    statement = (
        select(Employee)
        .where(
            and_(
                Employee.department == department,
                Employee.status == "Activo",  # Only active employees
                Employee.is_active == True,
            )
        )
        .order_by(Employee.first_name, Employee.last_name)
    )
    return session.exec(statement).all()


def get_available_shift_types(session: Session) -> List[ShiftType]:
    """
    Get all shift types available for assignment.

    Used for populating shift type dropdown.

    Args:
        session: Database session

    Returns:
        List of all shift types
    """
    statement = select(ShiftType).order_by(ShiftType.name)
    return session.exec(statement).all()


def check_vacation_conflict(
    employee_id: str,
    shift_date: date,
    session: Session,
) -> Optional[str]:
    """
    Check if employee has approved vacation on shift date.

    Used to block shift assignment during vacation periods.

    Args:
        employee_id: Employee ID
        shift_date: Date of proposed shift
        session: Database session

    Returns:
        None if no conflict, or vacation period string (e.g., "2026-03-15 to 2026-03-20")
    """
    # Query for approved vacation requests covering this date
    statement = (
        select(VacationRequest)
        .where(
            and_(
                VacationRequest.employee_id == employee_id,
                VacationRequest.status == "Aprobado",
                VacationRequest.start_date <= shift_date,
                VacationRequest.end_date >= shift_date,
            )
        )
    )
    vacation = session.exec(statement).first()

    if vacation:
        return f"{vacation.start_date} to {vacation.end_date}"
    return None


def check_shift_exists(
    employee_id: str,
    shift_date: date,
    session: Session,
) -> Optional[ShiftRecord]:
    """
    Check if employee already has shift on this date.

    Used to detect conflicts before assignment.

    Args:
        employee_id: Employee ID
        shift_date: Date of proposed shift
        session: Database session

    Returns:
        Existing ShiftRecord if found, None otherwise
    """
    statement = (
        select(ShiftRecord)
        .where(
            and_(
                ShiftRecord.employee_id == employee_id,
                ShiftRecord.date == shift_date,
            )
        )
    )
    return session.exec(statement).first()


def get_shift_type_by_id(shift_type_id: str, session: Session) -> ShiftType:
    """
    Get shift type by ID.

    Args:
        shift_type_id: Shift type ID
        session: Database session

    Returns:
        ShiftType model

    Raises:
        NotFoundError: If shift type not found
    """
    shift_type = session.get(ShiftType, shift_type_id)
    if not shift_type:
        raise NotFoundError("ShiftType", shift_type_id)
    return shift_type


def get_shift_by_id(shift_id: str, session: Session) -> ShiftRecord:
    """
    Get shift record by ID.

    Args:
        shift_id: Shift record ID
        session: Database session

    Returns:
        ShiftRecord model

    Raises:
        NotFoundError: If shift not found
    """
    shift = session.get(ShiftRecord, shift_id)
    if not shift:
        raise NotFoundError("ShiftRecord", shift_id)
    return shift


def check_shift_worked(shift_id: str, session: Session) -> bool:
    """
    Check if shift has already been worked (entry_time set).

    Used to prevent deletion of worked shifts.

    Args:
        shift_id: Shift record ID
        session: Database session

    Returns:
        True if shift has entry_time set
    """
    shift = get_shift_by_id(shift_id, session)
    return shift.entry_time is not None


def get_employee_vacation_balance(
    employee_id: str,
    year: int,
    session: Session,
) -> Optional[VacationBalance]:
    """
    Get vacation balance for employee in specific year.

    Used to show remaining days in vacation approval dialog.

    Args:
        employee_id: Employee ID
        year: Year
        session: Database session

    Returns:
        VacationBalance or None if not found
    """
    statement = (
        select(VacationBalance)
        .where(
            and_(
                VacationBalance.employee_id == employee_id,
                VacationBalance.year == year,
            )
        )
    )
    return session.exec(statement).first()


def get_vacation_status_for_date(
    employee_id: str,
    check_date: date,
    session: Session,
) -> Optional[str]:
    """
    Get vacation status for specific date (if applicable).

    Used by roster calendar to show vacation indicator.

    Args:
        employee_id: Employee ID
        check_date: Date to check
        session: Database session

    Returns:
        Status ('Aprobado', 'Pendiente', 'Rechazado') or None
    """
    statement = (
        select(VacationRequest.status)
        .where(
            and_(
                VacationRequest.employee_id == employee_id,
                VacationRequest.start_date <= check_date,
                VacationRequest.end_date >= check_date,
            )
        )
    )
    result = session.exec(statement).first()
    return result
