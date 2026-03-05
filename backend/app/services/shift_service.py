"""T066: Shift service with clock-in/clock-out management.

Updated for Feature 004: Shift Roster Calendar
- Added get_shifts_for_month for roster calendar view
- Added create_shift for roster planning
- Added update_shift for updating assigned shifts
- Added delete_shift for removing shifts
"""

import uuid
from datetime import UTC, date, datetime
from calendar import monthrange

from sqlmodel import Session, func, select

from app.common.exceptions import NotFoundError, ValidationError
from app.models.employee import Employee
from app.models.shift_record import ShiftRecord
from app.schemas.shift import ShiftRecordResponse, ShiftResponse


def _to_response(rec: ShiftRecord, session: Session) -> ShiftRecordResponse:
    emp = session.get(Employee, rec.employee_id)
    return ShiftRecordResponse(
        id=rec.id,
        employee_id=rec.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
        employee_image=emp.profile_image if emp else None,
        date=rec.date,
        entry_time=rec.entry_time.isoformat(),
        exit_time=rec.exit_time.isoformat() if rec.exit_time else None,
        location_lat=rec.location_lat,
        location_lng=rec.location_lng,
        task_label=rec.task_label,
    )


def clock_in(
    employee_id: uuid.UUID,
    tenant_id: uuid.UUID,
    session: Session,
    location_lat: float | None = None,
    location_lng: float | None = None,
    task_label: str | None = None,
) -> ShiftRecordResponse:
    # Check no active shift exists
    active = session.exec(
        select(ShiftRecord).where(
            ShiftRecord.employee_id == employee_id,
            ShiftRecord.tenant_id == tenant_id,
            ShiftRecord.exit_time == None,  # noqa: E711
        )
    ).first()
    if active:
        raise ValidationError(
            "El empleado ya tiene un turno activo", "ACTIVE_SHIFT_EXISTS"
        )

    # Verify employee exists
    employee = session.exec(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.tenant_id == tenant_id,
            Employee.is_active == True,  # noqa: E712
        )
    ).first()
    if not employee:
        raise NotFoundError("Empleado no encontrado")

    now = datetime.now(UTC)
    record = ShiftRecord(
        tenant_id=tenant_id,
        employee_id=employee_id,
        date=now.date(),
        entry_time=now,
        location_lat=location_lat,
        location_lng=location_lng,
        task_label=task_label,
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return _to_response(record, session)


def clock_out(
    shift_id: uuid.UUID,
    tenant_id: uuid.UUID,
    session: Session,
    location_lat: float | None = None,
    location_lng: float | None = None,
) -> ShiftRecordResponse:
    record = session.exec(
        select(ShiftRecord).where(
            ShiftRecord.id == shift_id,
            ShiftRecord.tenant_id == tenant_id,
        )
    ).first()
    if not record:
        raise NotFoundError("Registro de turno no encontrado")

    if record.exit_time:
        raise ValidationError("El turno ya fue cerrado", "SHIFT_ALREADY_CLOSED")

    now = datetime.now(UTC)
    record.exit_time = now
    record.updated_at = now
    if location_lat is not None:
        record.location_lat = location_lat
    if location_lng is not None:
        record.location_lng = location_lng

    session.add(record)
    session.commit()
    session.refresh(record)
    return _to_response(record, session)


def list_shifts(
    tenant_id: uuid.UUID,
    session: Session,
    employee_id: uuid.UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = 1,
    size: int = 20,
) -> dict:
    query = select(ShiftRecord).where(ShiftRecord.tenant_id == tenant_id)

    if employee_id:
        query = query.where(ShiftRecord.employee_id == employee_id)
    if date_from:
        query = query.where(ShiftRecord.date >= date_from)
    if date_to:
        query = query.where(ShiftRecord.date <= date_to)

    query = query.order_by(ShiftRecord.entry_time.desc())  # type: ignore[union-attr]

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    offset = (page - 1) * size
    records = session.exec(query.offset(offset).limit(size)).all()
    pages = (total + size - 1) // size if total > 0 else 1

    return {
        "items": [_to_response(r, session) for r in records],
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


# ============================================================================
# NEW METHODS FOR SHIFT ROSTER CALENDAR (Feature 004)
# ============================================================================


def _check_access(user_role: str, requesting_employee_id: uuid.UUID | None, target_employee_id: uuid.UUID) -> bool:
    """
    Check if user has access to view/manage shifts for target employee.

    - Empleado: can only access own shifts
    - Moderador/Admin: can access all
    """
    if user_role == "Empleado":
        return requesting_employee_id == target_employee_id
    return True  # Moderador/Admin can access all


def get_shifts_for_month(
    tenant_id: uuid.UUID,
    session: Session,
    month: str,
    employee_id: uuid.UUID | None = None,
    current_user: dict | None = None,
) -> dict:
    """
    Get all shifts for a given month (for roster calendar).

    Args:
        tenant_id: Tenant UUID
        session: Database session
        month: Month string in YYYY-MM format
        employee_id: Optional employee filter
        current_user: Current user dict with 'role', 'id', 'employee_id'

    Returns:
        {
            "shifts": [ShiftResponse],
            "total": int
        }
    """
    try:
        year, month_num = map(int, month.split("-"))
    except (ValueError, IndexError):
        raise ValidationError("Invalid month format. Use YYYY-MM", "INVALID_MONTH_FORMAT")

    # Apply RBAC: Empleado can only see own shifts
    if current_user and current_user.get("role") == "Empleado":
        employee_id = uuid.UUID(current_user.get("employee_id", ""))

    # Get first and last day of month
    first_day = date(year, month_num, 1)
    last_day = date(year, month_num, monthrange(year, month_num)[1])

    # Query all shifts for the month
    query = select(ShiftRecord).where(
        ShiftRecord.tenant_id == tenant_id,
        ShiftRecord.date >= first_day,
        ShiftRecord.date <= last_day,
    )

    if employee_id:
        query = query.where(ShiftRecord.employee_id == employee_id)

    query = query.order_by(ShiftRecord.date, ShiftRecord.shift_type)  # type: ignore[union-attr]

    shifts = session.exec(query).all()
    total = len(shifts)

    # Convert to response format
    shift_responses = []
    for shift in shifts:
        emp = session.get(Employee, shift.employee_id)
        response_data = {
            "id": shift.id,
            "employee_id": shift.employee_id,
            "employee_name": f"{emp.first_name} {emp.last_name}" if emp else None,
            "date": shift.date,
            "shift_type": shift.shift_type,
            "created_at": shift.created_at.isoformat() if shift.created_at else None,
            "updated_at": shift.updated_at.isoformat() if shift.updated_at else None,
        }
        shift_responses.append(ShiftResponse(**response_data))

    return {
        "shifts": shift_responses,
        "total": total,
    }


def create_shift(
    tenant_id: uuid.UUID,
    session: Session,
    employee_id: uuid.UUID,
    shift_date: date,
    shift_type: str,
    created_by: uuid.UUID,
) -> dict:
    """
    Create a new shift assignment.

    Args:
        tenant_id: Tenant UUID
        session: Database session
        employee_id: Employee to assign
        shift_date: Date of shift
        shift_type: Type of shift (morning, afternoon, night)
        created_by: User ID creating the shift

    Returns:
        {
            "shift": ShiftResponse,
            "warning": optional string
        }

    Raises:
        ValidationError: If date is in past, employee not found, or conflict detected
    """
    # Validate date not in past
    today = date.today()
    if shift_date < today:
        raise ValidationError("Cannot assign shifts in the past", "PAST_DATE_INVALID")

    # Verify employee exists and is active
    employee = session.exec(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.tenant_id == tenant_id,
            Employee.is_active == True,  # noqa: E712
        )
    ).first()
    if not employee:
        raise ValidationError("Employee not found or inactive", "EMPLOYEE_NOT_FOUND")

    # Check for conflict: no duplicate shifts per employee per day
    existing = session.exec(
        select(ShiftRecord).where(
            ShiftRecord.tenant_id == tenant_id,
            ShiftRecord.employee_id == employee_id,
            ShiftRecord.date == shift_date,
        )
    ).first()
    if existing:
        raise ValidationError(
            f"Employee {employee.first_name} {employee.last_name} already has a shift on {shift_date}",
            "SHIFT_CONFLICT",
        )

    # Create shift record
    now = datetime.now(UTC)
    shift = ShiftRecord(
        tenant_id=tenant_id,
        employee_id=employee_id,
        date=shift_date,
        shift_type=shift_type,
        created_by=created_by,
        created_at=now,
        updated_at=now,
    )
    session.add(shift)
    session.commit()
    session.refresh(shift)

    # Check for vacation warning (informational, doesn't block)
    warning = None
    # TODO: Check VacationRequest for approved vacations on this date

    response_data = {
        "id": shift.id,
        "employee_id": shift.employee_id,
        "employee_name": f"{employee.first_name} {employee.last_name}",
        "date": shift.date,
        "shift_type": shift.shift_type,
        "created_at": shift.created_at.isoformat(),
        "updated_at": shift.updated_at.isoformat(),
    }

    return {
        "shift": ShiftResponse(**response_data),
        "warning": warning,
    }


def update_shift(
    tenant_id: uuid.UUID,
    session: Session,
    shift_id: uuid.UUID,
    shift_type: str,
    updated_by: uuid.UUID,
) -> ShiftResponse:
    """
    Update an existing shift's type.

    Args:
        tenant_id: Tenant UUID
        session: Database session
        shift_id: Shift ID to update
        shift_type: New shift type
        updated_by: User ID updating the shift

    Returns:
        ShiftResponse

    Raises:
        NotFoundError: If shift not found
    """
    shift = session.exec(
        select(ShiftRecord).where(
            ShiftRecord.id == shift_id,
            ShiftRecord.tenant_id == tenant_id,
        )
    ).first()
    if not shift:
        raise NotFoundError("Shift not found")

    shift.shift_type = shift_type
    shift.updated_at = datetime.now(UTC)
    session.add(shift)
    session.commit()
    session.refresh(shift)

    emp = session.get(Employee, shift.employee_id)
    response_data = {
        "id": shift.id,
        "employee_id": shift.employee_id,
        "employee_name": f"{emp.first_name} {emp.last_name}" if emp else None,
        "date": shift.date,
        "shift_type": shift.shift_type,
        "created_at": shift.created_at.isoformat(),
        "updated_at": shift.updated_at.isoformat(),
    }
    return ShiftResponse(**response_data)


def delete_shift(
    tenant_id: uuid.UUID,
    session: Session,
    shift_id: uuid.UUID,
    deleted_by: uuid.UUID,
) -> None:
    """
    Delete a shift assignment.

    Args:
        tenant_id: Tenant UUID
        session: Database session
        shift_id: Shift ID to delete
        deleted_by: User ID deleting the shift

    Raises:
        NotFoundError: If shift not found
    """
    shift = session.exec(
        select(ShiftRecord).where(
            ShiftRecord.id == shift_id,
            ShiftRecord.tenant_id == tenant_id,
        )
    ).first()
    if not shift:
        raise NotFoundError("Shift not found")

    session.delete(shift)
    session.commit()
