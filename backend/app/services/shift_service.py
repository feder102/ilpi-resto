"""T066: Shift service with clock-in/clock-out management.

Updated for Feature 004: Shift Roster Calendar
- Added get_shifts_for_month for roster calendar view
- Added create_shift for roster planning
- Added update_shift for updating assigned shifts
- Added delete_shift for removing shifts
"""

import logging
import uuid
from calendar import monthrange
from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlmodel import Session, func, select

from app.common.exceptions import NotFoundError, ShiftConflictError, ValidationError
from app.models.employee import Employee
from app.models.shift_record import ShiftRecord
from app.models.shift_type import ShiftType
from app.models.vacation_request import VacationRequest
from app.schemas.shift import BulkShiftCreate, ShiftRecordResponse

logger = logging.getLogger(__name__)

# Maximum date span (inclusive) allowed for a single bulk shift operation.
# Bounds the per-request cost (days * employees) to avoid resource exhaustion.
MAX_BULK_RANGE_DAYS = 92


def _to_response(rec: ShiftRecord, session: Session) -> ShiftRecordResponse:
    emp = session.get(Employee, rec.employee_id)
    return ShiftRecordResponse(
        id=rec.id,
        employee_id=rec.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
        employee_image=emp.profile_image if emp else None,
        date=rec.date,
        entry_time=rec.entry_time.isoformat() if rec.entry_time else None,
        exit_time=rec.exit_time.isoformat() if rec.exit_time else None,
        location_lat=rec.location_lat,
        location_lng=rec.location_lng,
        task_label=rec.task_label,
    )


def list_shifts(
    tenant_id: uuid.UUID,
    session: Session,
    employee_id: uuid.UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = 1,
    size: int = 20,
) -> dict[str, Any]:
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


def _check_vacation_conflict(
    employee_id: uuid.UUID,
    shift_date: date,
    tenant_id: uuid.UUID,
    session: Session,
) -> bool:
    """
    Check if employee has approved vacation on the shift date.

    Args:
        employee_id: Employee UUID
        shift_date: Date of shift assignment
        tenant_id: Tenant UUID
        session: Database session

    Returns:
        True if vacation exists on this date, False otherwise

    Raises:
        ShiftConflictError: If approved vacation overlaps with shift date
    """
    vacation = session.exec(
        select(VacationRequest).where(
            VacationRequest.tenant_id == tenant_id,
            VacationRequest.employee_id == employee_id,
            VacationRequest.status == "Aprobado",
            VacationRequest.start_date <= shift_date,
            VacationRequest.end_date >= shift_date,
        )
    ).first()

    if vacation:
        raise ShiftConflictError(
            f"El empleado tiene vacaciones aprobadas del {vacation.start_date.isoformat()} "
            f"al {vacation.end_date.isoformat()}. No se puede asignar un turno para {shift_date.isoformat()}."
        )
    return False


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
) -> dict[str, Any]:
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
    except (ValueError, IndexError) as e:
        raise ValidationError("Invalid month format. Use YYYY-MM") from e

    # Apply RBAC: Empleado can only see own shifts
    if current_user and current_user.get("role") == "Empleado":
        emp_id_str = current_user.get("employee_id")
        if not emp_id_str:
            raise ValidationError("Employee ID not found in token")
        try:
            employee_id = uuid.UUID(emp_id_str)
        except ValueError as e:
            raise ValidationError("Invalid employee ID format in token") from e

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

    query = query.order_by(ShiftRecord.date, ShiftRecord.shift_type_id)  # type: ignore[union-attr]

    shifts = session.exec(query).all()
    total = len(shifts)

    # Convert to response format
    shift_responses = []
    for shift in shifts:
        emp = session.get(Employee, shift.employee_id)
        shift_type = session.get(ShiftType, shift.shift_type_id) if shift.shift_type_id else None
        response_data = {
            "id": str(shift.id),
            "employee_id": str(shift.employee_id),
            "employee_name": f"{emp.first_name} {emp.last_name}" if emp else None,
            "date": shift.date.isoformat(),
            "shift_type_id": str(shift.shift_type_id) if shift.shift_type_id else None,
            "shift_type_name": shift_type.name if shift_type else None,
            "created_at": shift.created_at.isoformat() if shift.created_at else None,
            "updated_at": shift.updated_at.isoformat() if shift.updated_at else None,
        }
        shift_responses.append(response_data)

    return {
        "shifts": shift_responses,
        "total": total,
    }


def create_shift(
    tenant_id: uuid.UUID,
    session: Session,
    employee_id: uuid.UUID,
    shift_date: date,
    shift_type_id: uuid.UUID,
    created_by: uuid.UUID,
) -> dict[str, Any]:
    """
    Create a new shift assignment.

    Args:
        tenant_id: Tenant UUID
        session: Database session
        employee_id: Employee to assign
        shift_date: Date of shift
        shift_type_id: UUID of shift type
        created_by: User ID creating the shift

    Returns:
        {
            "shift": ShiftResponse,
            "warning": optional string
        }

    Raises:
        ValidationError: If employee not found, or conflict detected
    """
    # Verify employee exists and is active
    employee = session.exec(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.tenant_id == tenant_id,
            Employee.is_active == True,  # noqa: E712
        )
    ).first()
    if not employee:
        raise ValidationError("Employee not found or inactive")

    # Check for conflict: no duplicate shifts per employee per day
    existing = session.exec(
        select(ShiftRecord).where(
            ShiftRecord.tenant_id == tenant_id,
            ShiftRecord.employee_id == employee_id,
            ShiftRecord.date == shift_date,
        )
    ).first()
    if existing:
        raise ShiftConflictError(
            f"No se puede asignar el turno: {employee.first_name} {employee.last_name} "
            f"ya tiene un turno asignado el {shift_date.isoformat()}. "
            f"Por favor, elige otro día o modifica el turno existente."
        )

    # Check for vacation conflict: employee cannot have approved vacation on shift date
    _check_vacation_conflict(employee_id, shift_date, tenant_id, session)

    # Verify shift type exists and is active
    shift_type = session.exec(
        select(ShiftType).where(
            ShiftType.id == shift_type_id,
            ShiftType.tenant_id == tenant_id,
            ShiftType.is_active == True,  # noqa: E712
        )
    ).first()
    if not shift_type:
        raise ValidationError("Tipo de turno no encontrado o inactivo")

    # Create shift record
    now = datetime.now(UTC)
    shift = ShiftRecord(
        tenant_id=tenant_id,
        employee_id=employee_id,
        date=shift_date,
        shift_type_id=shift_type_id,
        created_by=created_by,
        created_at=now,
        updated_at=now,
    )
    session.add(shift)
    session.commit()
    session.refresh(shift)

    warning = None

    response_data = {
        "id": str(shift.id),
        "employee_id": str(shift.employee_id),
        "employee_name": f"{employee.first_name} {employee.last_name}",
        "date": shift.date.isoformat(),
        "shift_type_id": str(shift.shift_type_id) if shift.shift_type_id else None,
        "shift_type_name": shift_type.name,
        "created_at": shift.created_at.isoformat(),
        "updated_at": shift.updated_at.isoformat(),
    }

    return {
        "shift": response_data,
        "warning": warning,
    }


def _vacation_overlap(
    employee_id: uuid.UUID,
    shift_date: date,
    tenant_id: uuid.UUID,
    session: Session,
) -> VacationRequest | None:
    """Return the approved vacation overlapping shift_date, or None (non-raising)."""
    return session.exec(
        select(VacationRequest).where(
            VacationRequest.tenant_id == tenant_id,
            VacationRequest.employee_id == employee_id,
            VacationRequest.status == "Aprobado",
            VacationRequest.start_date <= shift_date,
            VacationRequest.end_date >= shift_date,
        )
    ).first()


def create_shifts_bulk(
    tenant_id: uuid.UUID,
    session: Session,
    body: BulkShiftCreate,
    created_by: uuid.UUID,
) -> dict[str, Any]:
    """
    Bulk-assign a shift type to several employees over a date range.

    For each (employee, day) combination the same conflict rules as create_shift
    apply: days with an existing shift or an approved vacation are skipped and
    reported. Past dates are allowed (exceptional manual load). All successful
    inserts are committed in a single transaction.

    Args:
        tenant_id: Tenant UUID
        session: Database session
        body: Bulk request (employees, shift type, date range, weekend flag)
        created_by: User ID creating the shifts

    Returns:
        {
            "created": [ShiftResponse],
            "skipped": [{"employee_id", "employee_name", "date", "reason"}],
            "created_count": int,
            "skipped_count": int,
        }

    Raises:
        ValidationError: If the date range is invalid or the shift type is missing
    """
    # Validate date range
    if body.start_date > body.end_date:
        raise ValidationError("La fecha de inicio no puede ser posterior a la fecha de fin")

    # Bound the range to keep the operation cost (days * employees) manageable
    range_days = (body.end_date - body.start_date).days + 1
    if range_days > MAX_BULK_RANGE_DAYS:
        raise ValidationError(
            f"El rango no puede superar los {MAX_BULK_RANGE_DAYS} días"
        )

    # Verify shift type exists and is active (single query for the whole batch)
    shift_type = session.exec(
        select(ShiftType).where(
            ShiftType.id == body.shift_type_id,
            ShiftType.tenant_id == tenant_id,
            ShiftType.is_active == True,  # noqa: E712
        )
    ).first()
    if not shift_type:
        raise ValidationError("Tipo de turno no encontrado o inactivo")

    # Resolve target employees (active only), preserving requested order
    employees: dict[uuid.UUID, Employee] = {}
    for emp_id in body.employee_ids:
        if emp_id in employees:
            continue
        emp = session.exec(
            select(Employee).where(
                Employee.id == emp_id,
                Employee.tenant_id == tenant_id,
                Employee.is_active == True,  # noqa: E712
            )
        ).first()
        if emp:
            employees[emp_id] = emp

    created: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    now = datetime.now(UTC)

    for emp_id in body.employee_ids:
        employee = employees.get(emp_id)
        if not employee:
            skipped.append({
                "employee_id": str(emp_id),
                "employee_name": None,
                "date": body.start_date.isoformat(),
                "reason": "Empleado no encontrado o inactivo",
            })
            continue

        emp_name = f"{employee.first_name} {employee.last_name}"
        current = body.start_date
        while current <= body.end_date:
            day = current
            current = current + timedelta(days=1)

            # Skip weekends when only working days requested
            if not body.include_weekends and day.weekday() >= 5:
                continue

            # Skip if employee already has a shift that day
            existing = session.exec(
                select(ShiftRecord).where(
                    ShiftRecord.tenant_id == tenant_id,
                    ShiftRecord.employee_id == emp_id,
                    ShiftRecord.date == day,
                )
            ).first()
            if existing:
                skipped.append({
                    "employee_id": str(emp_id),
                    "employee_name": emp_name,
                    "date": day.isoformat(),
                    "reason": "Turno ya existente",
                })
                continue

            # Skip if employee has approved vacation that day
            vacation = _vacation_overlap(emp_id, day, tenant_id, session)
            if vacation:
                skipped.append({
                    "employee_id": str(emp_id),
                    "employee_name": emp_name,
                    "date": day.isoformat(),
                    "reason": "Vacaciones aprobadas",
                })
                continue

            shift = ShiftRecord(
                tenant_id=tenant_id,
                employee_id=emp_id,
                date=day,
                shift_type_id=body.shift_type_id,
                created_by=created_by,
                created_at=now,
                updated_at=now,
            )
            session.add(shift)
            session.flush()  # assign id without ending the transaction
            created.append({
                "id": str(shift.id),
                "employee_id": str(shift.employee_id),
                "employee_name": emp_name,
                "date": shift.date.isoformat(),
                "shift_type_id": str(shift.shift_type_id),
                "shift_type_name": shift_type.name,
                "created_at": shift.created_at.isoformat(),
                "updated_at": shift.updated_at.isoformat(),
            })

    session.commit()

    logger.info(
        "Bulk shifts created",
        extra={
            "event_type": "SHIFT_BULK_CREATE",
            "tenant_id": str(tenant_id),
            "created_by": str(created_by),
            "shift_type_id": str(body.shift_type_id),
            "employee_count": len(body.employee_ids),
            "created_count": len(created),
            "skipped_count": len(skipped),
            "start_date": body.start_date.isoformat(),
            "end_date": body.end_date.isoformat(),
            "include_weekends": body.include_weekends,
        },
    )

    return {
        "created": created,
        "skipped": skipped,
        "created_count": len(created),
        "skipped_count": len(skipped),
    }


def update_shift(
    tenant_id: uuid.UUID,
    session: Session,
    shift_id: uuid.UUID,
    shift_type_id: uuid.UUID,
    updated_by: uuid.UUID,
) -> dict[str, Any]:
    """
    Update an existing shift's type.

    Args:
        tenant_id: Tenant UUID
        session: Database session
        shift_id: Shift ID to update
        shift_type_id: New shift type UUID
        updated_by: User ID updating the shift

    Returns:
        ShiftResponse

    Raises:
        NotFoundError: If shift not found or shift type not found
    """
    shift = session.exec(
        select(ShiftRecord).where(
            ShiftRecord.id == shift_id,
            ShiftRecord.tenant_id == tenant_id,
        )
    ).first()
    if not shift:
        raise NotFoundError("Shift not found")

    # Verify shift type exists and is active
    shift_type = session.exec(
        select(ShiftType).where(
            ShiftType.id == shift_type_id,
            ShiftType.tenant_id == tenant_id,
            ShiftType.is_active == True,  # noqa: E712
        )
    ).first()
    if not shift_type:
        raise NotFoundError("Shift type not found or inactive")

    shift.shift_type_id = shift_type_id
    shift.updated_at = datetime.now(UTC)
    session.add(shift)
    session.commit()
    session.refresh(shift)

    emp = session.get(Employee, shift.employee_id)
    response_data = {
        "id": str(shift.id),
        "employee_id": str(shift.employee_id),
        "employee_name": f"{emp.first_name} {emp.last_name}" if emp else None,
        "date": shift.date.isoformat(),
        "shift_type_id": str(shift.shift_type_id) if shift.shift_type_id else None,
        "shift_type_name": shift_type.name,
        "created_at": shift.created_at.isoformat(),
        "updated_at": shift.updated_at.isoformat(),
    }
    return response_data


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


# ============================================================================
# EMPLOYEE WORKSPACE PORTAL ENDPOINTS (Feature 005: Employee Workspace)
# ============================================================================
# SECURITY: RLS enforcement - All methods filter to current employee's shifts
# using employee_id from JWT. No external employee_id parameter accepted.


def get_employee_month_shifts(
    tenant_id: uuid.UUID,
    employee_id: uuid.UUID,
    year: int,
    month: int,
    session: Session,
) -> dict[str, Any]:
    """
    Get employee's shifts for a specific month.

    SECURITY:
    - RLS: Only returns shifts for the specified employee_id (from JWT)
    - No employee_id parameter accepted from user

    Args:
        tenant_id: Tenant UUID (from JWT)
        employee_id: Employee UUID (from JWT - not user input)
        year: Year (YYYY)
        month: Month (1-12)
        session: Database session

    Returns:
        {
            "shifts": [ShiftRecord],
            "month": int,
            "year": int
        }

    Raises:
        ValidationError: If year/month invalid
    """
    try:
        first_day = date(year, month, 1)
        last_day = date(year, month, monthrange(year, month)[1])
    except (ValueError, IndexError) as e:
        raise ValidationError(f"Invalid year/month: {e}") from e

    # RLS: Only filter by current employee_id (from JWT, not user input)
    query = select(ShiftRecord).where(
        ShiftRecord.tenant_id == tenant_id,
        ShiftRecord.employee_id == employee_id,
        ShiftRecord.date >= first_day,
        ShiftRecord.date <= last_day,
    )
    query = query.order_by(ShiftRecord.date, ShiftRecord.shift_type_id)  # type: ignore[union-attr]

    shifts = session.exec(query).all()

    # Convert to response format (simplified for Employee Workspace)
    shift_responses = []
    for shift in shifts:
        shift_type = session.get(ShiftType, shift.shift_type_id) if shift.shift_type_id else None
        shift_responses.append({
            "id": str(shift.id),
            "employee_id": str(shift.employee_id),
            "date": shift.date.isoformat(),
            "shift_type_id": str(shift.shift_type_id) if shift.shift_type_id else None,
            "shift_type_name": shift_type.name if shift_type else None,
            "entry_time": shift.entry_time.isoformat() if shift.entry_time else None,
            "exit_time": shift.exit_time.isoformat() if shift.exit_time else None,
        })

    return {
        "shifts": shift_responses,
        "month": month,
        "year": year,
    }


def get_employee_shifts(
    tenant_id: uuid.UUID,
    employee_id: uuid.UUID,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = 1,
    size: int = 50,
    session: Session | None = None,
) -> dict[str, Any]:
    """
    Get employee's shifts for a date range (paginated).

    SECURITY:
    - RLS: Only returns shifts for the specified employee_id (from JWT)
    - No employee_id parameter accepted from user

    Args:
        tenant_id: Tenant UUID (from JWT)
        employee_id: Employee UUID (from JWT - not user input)
        date_from: Start date (optional)
        date_to: End date (optional)
        page: Page number (1-indexed)
        size: Items per page
        session: Database session

    Returns:
        {
            "shifts": [ShiftRecord],
            "total": int,
            "page": int,
            "size": int,
            "pages": int
        }
    """
    if session is None:
        raise ValidationError("Database session required")

    # RLS: Only filter by current employee_id (from JWT, not user input)
    query = select(ShiftRecord).where(
        ShiftRecord.tenant_id == tenant_id,
        ShiftRecord.employee_id == employee_id,
    )

    if date_from:
        query = query.where(ShiftRecord.date >= date_from)
    if date_to:
        query = query.where(ShiftRecord.date <= date_to)

    query = query.order_by(ShiftRecord.date.desc())  # type: ignore[union-attr]

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    offset = (page - 1) * size
    shifts = session.exec(query.offset(offset).limit(size)).all()
    pages = (total + size - 1) // size if total > 0 else 1

    # Convert to response format
    shift_responses = []
    for shift in shifts:
        shift_type = session.get(ShiftType, shift.shift_type_id) if shift.shift_type_id else None
        shift_responses.append({
            "id": str(shift.id),
            "employee_id": str(shift.employee_id),
            "date": shift.date.isoformat(),
            "shift_type_id": str(shift.shift_type_id) if shift.shift_type_id else None,
            "shift_type_name": shift_type.name if shift_type else None,
            "entry_time": shift.entry_time.isoformat() if shift.entry_time else None,
            "exit_time": shift.exit_time.isoformat() if shift.exit_time else None,
        })

    return {
        "shifts": shift_responses,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


def get_employee_today_shift(
    tenant_id: uuid.UUID,
    employee_id: uuid.UUID,
    session: Session,
) -> dict | None:
    """
    Get employee's shift for today.

    SECURITY:
    - RLS: Only returns current employee's shift

    Args:
        tenant_id: Tenant UUID (from JWT)
        employee_id: Employee UUID (from JWT - not user input)
        session: Database session

    Returns:
        ShiftRecord dict or None if no shift today
    """
    today = date.today()

    shift = session.exec(
        select(ShiftRecord).where(
            ShiftRecord.tenant_id == tenant_id,
            ShiftRecord.employee_id == employee_id,
            ShiftRecord.date == today,
        )
    ).first()

    if not shift:
        return None

    shift_type = session.get(ShiftType, shift.shift_type_id) if shift.shift_type_id else None

    return {
        "id": str(shift.id),
        "employee_id": str(shift.employee_id),
        "date": shift.date.isoformat(),
        "shift_type_id": str(shift.shift_type_id) if shift.shift_type_id else None,
        "shift_type_name": shift_type.name if shift_type else None,
        "entry_time": shift.entry_time.isoformat() if shift.entry_time else None,
        "exit_time": shift.exit_time.isoformat() if shift.exit_time else None,
    }


def get_employee_upcoming_shifts(
    tenant_id: uuid.UUID,
    employee_id: uuid.UUID,
    days: int = 7,
    session: Session | None = None,
) -> dict[str, Any]:
    """
    Get employee's upcoming shifts (next N days).

    SECURITY:
    - RLS: Only returns current employee's shifts

    Args:
        tenant_id: Tenant UUID (from JWT)
        employee_id: Employee UUID (from JWT - not user input)
        days: Number of days to look ahead (default: 7)
        session: Database session

    Returns:
        {
            "shifts": [ShiftRecord],
            "count": int
        }
    """
    if session is None:
        raise ValidationError("Database session required")

    today = date.today()
    future_date = date.fromordinal(today.toordinal() + days)

    # RLS: Only filter by current employee_id
    query = select(ShiftRecord).where(
        ShiftRecord.tenant_id == tenant_id,
        ShiftRecord.employee_id == employee_id,
        ShiftRecord.date >= today,
        ShiftRecord.date <= future_date,
    )
    query = query.order_by(ShiftRecord.date)

    shifts = session.exec(query).all()

    # Convert to response format
    shift_responses = []
    for shift in shifts:
        shift_type = session.get(ShiftType, shift.shift_type_id) if shift.shift_type_id else None
        shift_responses.append({
            "id": str(shift.id),
            "employee_id": str(shift.employee_id),
            "date": shift.date.isoformat(),
            "shift_type_id": str(shift.shift_type_id) if shift.shift_type_id else None,
            "shift_type_name": shift_type.name if shift_type else None,
            "entry_time": shift.entry_time.isoformat() if shift.entry_time else None,
            "exit_time": shift.exit_time.isoformat() if shift.exit_time else None,
        })

    return {
        "shifts": shift_responses,
        "count": len(shift_responses),
    }
