"""T010: Moderator Shift Service - Shift management and conflict detection.

Feature 006: Moderator Portal

Provides methods for:
- Roster retrieval with vacation status indicators
- Shift assignment with conflict detection
- Employee filtering by department
"""

from datetime import date

from sqlmodel import Session, and_, select

from app.common.exceptions import (
    ForbiddenError,
    NotFoundError,
    ValidationError,
)
from app.models import (
    Employee,
    ShiftRecord,
    ShiftType,
    VacationBalance,
    VacationRequest,
)
from app.models.department import Department


def get_department_employees(department: Department, session: Session) -> list[Employee]:
    """
    Get all active employees in moderator's department.

    Used for:
    - Populating employee dropdown in shift assignment form
    - Listing team members for roster

    Args:
        department: Department ORM object
        session: Database session

    Returns:
        List of active employees in department, sorted by name
    """
    statement = (
        select(Employee)
        .where(
            and_(
                Employee.department_id == department.id,
                Employee.status == "Activo",  # Only active employees
                Employee.is_active.is_(True),
            )
        )
        .order_by(Employee.first_name, Employee.last_name)
    )
    return session.exec(statement).all()


def get_available_shift_types(session: Session) -> list[ShiftType]:
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
) -> str | None:
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
) -> ShiftRecord | None:
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
) -> VacationBalance | None:
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


# T054-T055: Update shift with new shift type
def update_shift(
    shift_id: str,
    new_shift_type_id: str,
    moderator_employee_id: str,
    session: Session,
) -> dict:
    """
    T055: Update/replace an existing shift assignment.

    Applies same conflict validation as assign_shift.
    Does not allow changing employee, only shift type.

    Used by: PUT /shifts/{shift_id}

    Args:
        shift_id: Shift record to update
        new_shift_type_id: New shift type
        moderator_employee_id: Moderator's employee ID (for scoping)
        session: Database session

    Returns:
        Updated shift record

    Raises:
        NotFoundError: If shift not found
        VacationConflictError: If vacation on that date
        ShiftExistsError: Actually won't happen (same shift)
    """
    from app.common.exceptions import VacationConflictError

    # Get existing shift
    shift = get_shift_by_id(shift_id, session)

    # Get moderator's department
    moderator = session.get(Employee, moderator_employee_id)
    if not moderator:
        raise NotFoundError("Moderador", moderator_employee_id)

    # Verify shift's employee is in moderator's department
    employee = session.get(Employee, shift.employee_id)
    if not employee or employee.department_id != moderator.department_id:
        raise ForbiddenError("No tienes acceso a este turno")

    # Re-check vacation conflict (may have changed)
    vacation_conflict = check_vacation_conflict(shift.employee_id, shift.date, session)
    if vacation_conflict:
        raise VacationConflictError(
            f"El empleado tiene vacaciones aprobadas del {vacation_conflict}"
        )

    # Get new shift type
    new_shift_type = get_shift_type_by_id(new_shift_type_id, session)

    # Update shift type
    shift.shift_type_id = new_shift_type_id
    session.add(shift)
    session.commit()
    session.refresh(shift)

    return {
        "id": str(shift.id),
        "employee_id": str(shift.employee_id),
        "employee_name": f"{employee.first_name} {employee.last_name}",
        "date": shift.date.isoformat(),
        "shift_type_id": str(new_shift_type.id),
        "shift_type_name": new_shift_type.name,
        "entry_time": shift.entry_time.isoformat() if shift.entry_time else None,
        "exit_time": shift.exit_time.isoformat() if shift.exit_time else None,
        "message": f"Turno actualizado a {new_shift_type.name}",
    }


# T056-T057: Delete shift
def delete_shift(
    shift_id: str,
    moderator_employee_id: str,
    session: Session,
) -> None:
    """
    T057: Delete a shift assignment.

    Only allowed if shift hasn't been worked (entry_time not set).

    Used by: DELETE /shifts/{shift_id}

    Args:
        shift_id: Shift record to delete
        moderator_employee_id: Moderator's employee ID (for scoping)
        session: Database session

    Raises:
        NotFoundError: If shift not found
        ValidationError: If shift has been worked (entry_time set)
        ForbiddenError: If not in same department
    """
    # Get shift
    shift = get_shift_by_id(shift_id, session)

    # Get moderator's department
    moderator = session.get(Employee, moderator_employee_id)
    if not moderator:
        raise NotFoundError("Moderador", moderator_employee_id)

    # Verify shift's employee is in moderator's department
    employee = session.get(Employee, shift.employee_id)
    if not employee or employee.department_id != moderator.department_id:
        raise ForbiddenError("No tienes acceso a este turno")

    # Check if shift has been worked
    if check_shift_worked(shift_id, session):
        raise ValidationError(
            "No se puede eliminar un turno que ya ha comenzado (entrada registrada)"
        )

    # Delete shift
    session.delete(shift)
    session.commit()


def get_vacation_status_for_date(
    employee_id: str,
    check_date: date,
    session: Session,
) -> str | None:
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


# T017: US1 - Roster retrieval
def get_department_roster(
    department: Department,
    year: int,
    month: int,
    session: Session,
) -> list[dict]:
    """
    Get shift roster for moderator's department for a specific month.

    Returns all shifts assigned to employees in the department,
    with vacation status indicators.

    Used by: GET /moderator/roster?year=YYYY&month=MM

    Args:
        department: Department ORM object
        year: Year
        month: Month (1-12)
        session: Database session

    Returns:
        List of roster days with employee, shift, and vacation info
    """
    # Query shifts for the month in this department
    statement = (
        select(ShiftRecord, Employee, ShiftType)
        .join(Employee, ShiftRecord.employee_id == Employee.id)
        .join(ShiftType, ShiftRecord.shift_type_id == ShiftType.id)
        .where(
            and_(
                Employee.department_id == department.id,
                Employee.is_active.is_(True),
            )
        )
        .order_by(ShiftRecord.date, Employee.first_name)
    )

    shifts = session.exec(statement).all()

    roster_days = []
    for shift, employee, shift_type in shifts:
        # Only include shifts in the requested month
        if shift.date.year != year or shift.date.month != month:
            continue

        # Get vacation status for this date
        vacation_status = get_vacation_status_for_date(
            employee.id, shift.date, session
        )

        roster_days.append({
            "id": str(shift.id),
            "employee_id": str(employee.id),
            "employee_name": f"{employee.first_name} {employee.last_name}",
            "date": shift.date.isoformat(),
            "shift_type_id": str(shift_type.id),
            "shift_type_name": shift_type.name,
            "entry_time": shift.entry_time.isoformat() if shift.entry_time else None,
            "exit_time": shift.exit_time.isoformat() if shift.exit_time else None,
            "vacation_status": vacation_status,
        })

    return roster_days


# T052-T053: Shift assignment with conflict detection
def assign_shift(
    employee_id: str,
    shift_date: date,
    shift_type_id: str,
    moderator_department: Department,
    session: Session,
) -> dict:
    """
    T053: Assign a shift to an employee with conflict detection.

    Validates:
    1. Employee is in moderator's department
    2. No approved vacation on that date
    3. No existing shift on that date

    Used by: POST /shifts/assign

    Args:
        employee_id: Employee to assign shift to
        shift_date: Date of shift
        shift_type_id: Shift type to assign
        moderator_department: Moderator's department for scoping
        session: Database session

    Returns:
        Created shift record with details

    Raises:
        EmployeeNotInDepartmentError: If employee not in moderator's dept
        VacationConflictError: If approved vacation on that date
        ShiftExistsError: If shift already exists on that date
    """
    from app.common.exceptions import (
        EmployeeNotInDepartmentError,
        ShiftExistsError,
        VacationConflictError,
    )

    # Get employee to verify department
    employee = session.get(Employee, employee_id)
    if not employee:
        raise NotFoundError("Empleado", employee_id)

    if employee.department_id != moderator_department.id:
        raise EmployeeNotInDepartmentError(
            f"El empleado {employee.first_name} no pertenece a {moderator_department.name}"
        )

    # Check for vacation conflict
    vacation_conflict = check_vacation_conflict(employee_id, shift_date, session)
    if vacation_conflict:
        raise VacationConflictError(
            f"El empleado tiene vacaciones aprobadas del {vacation_conflict}"
        )

    # Check for existing shift
    existing_shift = check_shift_exists(employee_id, shift_date, session)
    if existing_shift:
        raise ShiftExistsError(
            f"El empleado ya tiene un turno en esta fecha (ID: {existing_shift.id})"
        )

    # Get shift type to validate
    shift_type = get_shift_type_by_id(shift_type_id, session)

    # Create new shift with tenant_id from employee
    new_shift = ShiftRecord(
        tenant_id=employee.tenant_id,
        employee_id=employee_id,
        date=shift_date,
        shift_type_id=shift_type_id,
    )
    session.add(new_shift)
    session.commit()
    session.refresh(new_shift)

    return {
        "id": str(new_shift.id),
        "employee_id": str(new_shift.employee_id),
        "employee_name": f"{employee.first_name} {employee.last_name}",
        "date": new_shift.date.isoformat(),
        "shift_type_id": str(shift_type.id),
        "shift_type_name": shift_type.name,
        "entry_time": None,
        "exit_time": None,
        "message": f"Turno asignado a {employee.first_name} el {new_shift.date.strftime('%d/%m/%Y')}",
    }


def get_shifts_for_date(
    department: Department,
    check_date: date,
    session: Session,
) -> list[dict]:
    """
    T018: Get shifts assigned for a specific date in moderator's department.

    Returns shift details including employee names, shift types, and
    vacation status for the specified date.

    Used by: GET /moderator/shifts?date=YYYY-MM-DD

    Args:
        department: Department ORM object
        check_date: Date to retrieve shifts for
        session: Database session

    Returns:
        List of shifts with employee, shift type, and vacation info
    """
    statement = (
        select(ShiftRecord, Employee, ShiftType)
        .join(Employee, ShiftRecord.employee_id == Employee.id)
        .join(ShiftType, ShiftRecord.shift_type_id == ShiftType.id)
        .where(
            and_(
                Employee.department_id == department.id,
                Employee.is_active.is_(True),
                ShiftRecord.date == check_date,
            )
        )
        .order_by(Employee.first_name)
    )

    shifts = session.exec(statement).all()

    shifts_list = []
    for shift, employee, shift_type in shifts:
        vacation_status = get_vacation_status_for_date(
            employee.id, check_date, session
        )

        shifts_list.append({
            "id": str(shift.id),
            "employee_id": str(employee.id),
            "employee_name": f"{employee.first_name} {employee.last_name}",
            "date": shift.date.isoformat(),
            "shift_type_id": str(shift_type.id),
            "shift_type_name": shift_type.name,
            "entry_time": shift.entry_time.isoformat() if shift.entry_time else None,
            "exit_time": shift.exit_time.isoformat() if shift.exit_time else None,
            "vacation_status": vacation_status,
        })

    return shifts_list
