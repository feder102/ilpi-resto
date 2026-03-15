"""Time Tracking Service for Features 005 & 008.

Feature 005: Clock-in/out operations, time record management, and related queries.
Feature 008: Automatic time entry tracking from shifts and statistics queries.
All operations enforce Row-Level Security (RLS) - employees can only access their own records.
"""

import uuid
from datetime import UTC, datetime, date as date_type, timedelta
from decimal import Decimal
from typing import Any, Optional

from sqlmodel import Session, func, select

from app.common.exceptions import ValidationError, NotFoundError, ForbiddenError
from app.common.time_tracking_exceptions import BatchProcessingError, NoShiftsFoundError, HoursCalculationError
from app.models.time_record import TimeRecord
from app.models.shift_record import ShiftRecord
from app.models.time_entry import TimeEntry, TimeEntrySource
from app.models.shift_type import ShiftType
from app.models.employee import Employee
from app.schemas.time_tracking import TimeRecordResponse, ClockInResponse, ClockOutResponse, EmployeeStatisticsResponse, DepartmentStatisticsResponse, TimeEntryResponse, TimeEntryListResponse


def _check_employee_has_shift_today(
    employee_id: uuid.UUID,
    tenant_id: uuid.UUID,
    session: Session
) -> bool:
    """Check if employee has a shift scheduled for today."""
    today = date_type.today()
    statement = select(ShiftRecord).where(
        ShiftRecord.employee_id == employee_id,
        ShiftRecord.tenant_id == tenant_id,
        ShiftRecord.date == today
    )
    shift = session.exec(statement).first()
    return shift is not None


def _calculate_time_summary(
    clock_in: datetime,
    clock_out: Optional[datetime]
) -> dict[str, Any]:
    """Calculate time summary between clock in and clock out."""
    # Handle timezone-aware vs naive datetimes
    if clock_in.tzinfo is None:
        clock_in = clock_in.replace(tzinfo=UTC)
    if clock_out is not None and clock_out.tzinfo is None:
        clock_out = clock_out.replace(tzinfo=UTC)

    if clock_out is None:
        return {
            "total_hours": 0,
            "total_minutes": 0,
            "formatted": "En progreso",
            "clock_in": clock_in.strftime("%I:%M %p"),
            "clock_out": None,
        }

    duration = clock_out - clock_in
    total_seconds = int(duration.total_seconds())
    total_minutes = total_seconds // 60
    total_hours = total_minutes / 60

    hours = total_minutes // 60
    minutes = total_minutes % 60

    return {
        "total_hours": round(total_hours, 2),
        "total_minutes": total_minutes,
        "formatted": f"{hours}h {minutes}m",
        "clock_in": clock_in.strftime("%I:%M %p"),
        "clock_out": clock_out.strftime("%I:%M %p"),
    }


def _to_time_record_response(record: TimeRecord) -> TimeRecordResponse:
    """Convert TimeRecord model to response DTO."""
    return TimeRecordResponse(
        id=record.id,
        employee_id=record.employee_id,
        date=record.date.isoformat(),
        clock_in_timestamp=record.clock_in_timestamp,
        clock_out_timestamp=record.clock_out_timestamp,
    )


def clock_in(
    employee_id: uuid.UUID,
    tenant_id: uuid.UUID,
    current_user: dict,
    session: Session
) -> ClockInResponse:
    """Clock in employee for their shift.

    Args:
        employee_id: Employee UUID
        tenant_id: Tenant UUID
        current_user: JWT token payload (for RLS)
        session: Database session

    Returns:
        ClockInResponse with time record and status

    Raises:
        ForbiddenError: User is not the employee (RLS violation)
        ValidationError: No shift today, already clocked in, future timestamp, etc
    """
    # Row-Level Security: Verify employee can only clock in for themselves
    if current_user.get("role") == "Empleado":
        if str(employee_id) != current_user.get("employee_id"):
            raise ForbiddenError("Solo puedes registrar tu propio fichaje")

    # Validate: Employee has shift scheduled for today
    if not _check_employee_has_shift_today(employee_id, tenant_id, session):
        raise ValidationError(
            code="NO_SHIFT_TODAY",
            message="No tienes un turno programado para hoy"
        )

    # Validate: Check for existing active clock-in (no double clock-in)
    today = date_type.today()
    statement = select(TimeRecord).where(
        TimeRecord.employee_id == employee_id,
        TimeRecord.tenant_id == tenant_id,
        TimeRecord.date == today,
        TimeRecord.clock_out_timestamp.is_(None)  # Active clock-in
    )
    existing = session.exec(statement).first()

    if existing:
        raise ValidationError(
            code="ALREADY_CLOCKED_IN",
            message="Ya has registrado entrada. Por favor, registra la salida primero"
        )

    # Create new time record
    now = datetime.now(UTC)
    time_record = TimeRecord(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        employee_id=employee_id,
        date=today,
        clock_in_timestamp=now,
        clock_out_timestamp=None,
        created_at=now,
        updated_at=now,
    )

    session.add(time_record)
    session.commit()
    session.refresh(time_record)

    return ClockInResponse(
        time_record=_to_time_record_response(time_record),
        status="clocked-in",
        message=f"Entrada registrada correctamente a las {now.strftime('%H:%M')}"
    )


def clock_out(
    employee_id: uuid.UUID,
    tenant_id: uuid.UUID,
    current_user: dict,
    session: Session
) -> ClockOutResponse:
    """Clock out employee from their shift.

    Args:
        employee_id: Employee UUID
        tenant_id: Tenant UUID
        current_user: JWT token payload (for RLS)
        session: Database session

    Returns:
        ClockOutResponse with time record, summary, and status

    Raises:
        ForbiddenError: User is not the employee (RLS violation)
        ValidationError: Not currently clocked in, future timestamp, etc
    """
    # Row-Level Security: Verify employee can only clock out for themselves
    if current_user.get("role") == "Empleado":
        if str(employee_id) != current_user.get("employee_id"):
            raise ForbiddenError("Solo puedes registrar tu propia salida")

    # Validate: Employee is currently clocked in
    today = date_type.today()
    statement = select(TimeRecord).where(
        TimeRecord.employee_id == employee_id,
        TimeRecord.tenant_id == tenant_id,
        TimeRecord.date == today,
        TimeRecord.clock_out_timestamp.is_(None)  # Active clock-in
    )
    time_record = session.exec(statement).first()

    if not time_record:
        raise ValidationError(
            code="NOT_CLOCKED_IN",
            message="No estás registrado como entrada. Por favor, registra entrada primero"
        )

    # Validate: No future timestamps
    now = datetime.now(UTC)
    clock_in = time_record.clock_in_timestamp

    # Handle timezone-aware vs naive datetimes
    if clock_in.tzinfo is None:
        clock_in = clock_in.replace(tzinfo=UTC)

    if now < clock_in:
        raise ValidationError(
            code="FUTURE_TIMESTAMP",
            message="La hora de salida no puede ser anterior a la de entrada"
        )

    # Update time record with clock-out timestamp
    time_record.clock_out_timestamp = now
    time_record.updated_at = now

    session.add(time_record)
    session.commit()
    session.refresh(time_record)

    summary = _calculate_time_summary(time_record.clock_in_timestamp, time_record.clock_out_timestamp)

    return ClockOutResponse(
        time_record=_to_time_record_response(time_record),
        status="clocked-out",
        summary=summary,
        message=f"Salida registrada correctamente a las {now.strftime('%H:%M')}"
    )


def get_today_status(
    employee_id: uuid.UUID,
    tenant_id: uuid.UUID,
    current_user: dict,
    session: Session
) -> dict[str, Any]:
    """Get current clock-in/out status for today.

    Returns status indicating if employee is currently clocked in, clocked out, or has no record.
    Used by dashboard widget to display live clock status.

    Args:
        employee_id: Employee UUID
        tenant_id: Tenant UUID
        current_user: JWT token payload (for RLS)
        session: Database session

    Returns:
        Dict with status, record (if exists), and elapsed_seconds (if clocked in)

    Raises:
        ForbiddenError: User is not the employee (RLS violation)
    """
    # Row-Level Security: Verify employee can only see own status
    if current_user.get("role") == "Empleado":
        if str(employee_id) != current_user.get("employee_id"):
            raise ForbiddenError("Solo puedes ver tu propio estado de fichaje")

    today = date_type.today()
    statement = select(TimeRecord).where(
        TimeRecord.employee_id == employee_id,
        TimeRecord.tenant_id == tenant_id,
        TimeRecord.date == today,
    ).order_by(TimeRecord.created_at.desc())

    record = session.exec(statement).first()

    if not record:
        return {
            "status": "not_clocked_in",
            "record": None,
            "elapsed_seconds": 0,
            "message": "No hay registro de entrada para hoy",
        }

    if record.clock_out_timestamp is None:
        # Employee is currently clocked in
        clock_in = record.clock_in_timestamp

        # Handle timezone-aware vs naive datetimes
        if clock_in.tzinfo is None:
            clock_in = clock_in.replace(tzinfo=UTC)

        elapsed = datetime.now(UTC) - clock_in
        elapsed_seconds = int(elapsed.total_seconds())

        return {
            "status": "clocked_in",
            "record": _to_time_record_response(record),
            "elapsed_seconds": elapsed_seconds,
            "message": f"Entrada registrada a las {record.clock_in_timestamp.strftime('%H:%M')}",
        }
    else:
        # Employee is clocked out
        summary = _calculate_time_summary(record.clock_in_timestamp, record.clock_out_timestamp)
        return {
            "status": "clocked_out",
            "record": _to_time_record_response(record),
            "elapsed_seconds": 0,
            "summary": summary,
            "message": f"Salida registrada a las {record.clock_out_timestamp.strftime('%H:%M')}",
        }


def get_time_records(
    employee_id: uuid.UUID,
    tenant_id: uuid.UUID,
    current_user: dict,
    date_from: Optional[date_type] = None,
    date_to: Optional[date_type] = None,
    page: int = 1,
    size: int = 20,
    session: Session = None
) -> dict[str, Any]:
    """Get employee's time records for a date range.

    Args:
        employee_id: Employee UUID
        tenant_id: Tenant UUID
        current_user: JWT token payload (for RLS)
        date_from: Start date (default: 30 days ago)
        date_to: End date (default: today)
        page: Page number (1-indexed)
        size: Items per page (max 100)
        session: Database session

    Returns:
        Dict with items, total, page, size, pages

    Raises:
        ForbiddenError: User is not the employee (RLS violation)
        ValidationError: Invalid date range
    """
    # Row-Level Security: Verify employee can only see own records
    if current_user.get("role") == "Empleado":
        if str(employee_id) != current_user.get("employee_id"):
            raise ForbiddenError("Solo puedes ver tus propios registros de fichaje")

    # Default date range: last 30 days
    if date_to is None:
        date_to = date_type.today()
    if date_from is None:
        date_from = date_to - timedelta(days=30)

    # Validate date range
    if date_from > date_to:
        raise ValidationError(
            code="INVALID_DATE_RANGE",
            message="date_from debe ser anterior a date_to"
        )

    # Query time records
    statement = select(TimeRecord).where(
        TimeRecord.tenant_id == tenant_id,
        TimeRecord.employee_id == employee_id,
        TimeRecord.date >= date_from,
        TimeRecord.date <= date_to,
    ).order_by(TimeRecord.date.desc())

    # Count total
    count_statement = select(TimeRecord).where(
        TimeRecord.tenant_id == tenant_id,
        TimeRecord.employee_id == employee_id,
        TimeRecord.date >= date_from,
        TimeRecord.date <= date_to,
    )
    total = len(session.exec(count_statement).all())

    # Pagination
    offset = (page - 1) * size
    records = session.exec(statement.offset(offset).limit(size)).all()

    # Convert to response DTOs
    items = [_to_time_record_response(record) for record in records]

    # Calculate pages
    pages = (total + size - 1) // size

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


# Feature 008: Automatic Time Tracking Service
class TimeTrackingService:
    """Service for automatic time entry generation and statistics tracking."""

    @staticmethod
    def _calculate_hours(start_time, end_time) -> Decimal:
        """Calculate hours between two times, handling overnight shifts.

        Args:
            start_time: datetime.time object for shift start
            end_time: datetime.time object for shift end

        Returns:
            Decimal: Hours worked (e.g., 8.0)

        Raises:
            HoursCalculationError: If calculation fails
        """
        try:
            start_minutes = start_time.hour * 60 + start_time.minute
            end_minutes = end_time.hour * 60 + end_time.minute

            if end_minutes < start_minutes:
                # Overnight shift: e.g., 22:00 to 06:00 = 8 hours
                total_minutes = (24 * 60) - start_minutes + end_minutes
            else:
                total_minutes = end_minutes - start_minutes

            hours = Decimal(total_minutes) / Decimal(60)
            return hours.quantize(Decimal('0.00'))
        except Exception as e:
            raise HoursCalculationError(f"Failed to calculate hours: {str(e)}")

    @staticmethod
    def generate_time_entries_for_date(
        db: Session,
        tenant_id: uuid.UUID,
        target_date: date_type,
    ) -> int:
        """Generate TimeEntry records for all shifts on a specific date.

        Queries all ShiftRecord entries for the tenant on the target date,
        then creates corresponding TimeEntry records if they don't already exist.
        Idempotent: Running multiple times produces the same result (no duplicates).

        Args:
            db: Database session
            tenant_id: Tenant UUID
            target_date: Date to process (usually yesterday)

        Returns:
            int: Count of TimeEntry records created

        Raises:
            BatchProcessingError: If batch processing fails
            NoShiftsFoundError: If no shifts found (non-fatal)
        """
        try:
            # Get all shifts for the target date
            shifts = db.exec(
                select(ShiftRecord)
                .where(
                    ShiftRecord.tenant_id == tenant_id,
                    ShiftRecord.date == target_date,
                )
            ).all()

            if not shifts:
                raise NoShiftsFoundError(target_date=target_date)

            entries_created = 0

            for shift in shifts:
                if not shift.shift_type_id:
                    continue  # Skip shifts without assigned shift type

                # Get shift type for time windows
                shift_type = db.exec(
                    select(ShiftType).where(ShiftType.id == shift.shift_type_id)
                ).first()

                if not shift_type or not shift_type.time_windows:
                    continue

                # Get first time window (primary shift hours)
                time_window = shift_type.time_windows[0] if isinstance(shift_type.time_windows, list) else shift_type.time_windows
                # Parse time strings (format: "HH:MM")
                from datetime import time as time_cls
                start_str = time_window.get('start')
                end_str = time_window.get('end')
                start_time = datetime.strptime(start_str, "%H:%M").time() if start_str else None
                end_time = datetime.strptime(end_str, "%H:%M").time() if end_str else None

                if not start_time or not end_time:
                    continue

                # Calculate hours
                hours_worked = TimeTrackingService._calculate_hours(start_time, end_time)

                # Check for existing entry (idempotency)
                existing = db.exec(
                    select(TimeEntry).where(
                        TimeEntry.tenant_id == tenant_id,
                        TimeEntry.employee_id == shift.employee_id,
                        TimeEntry.shift_date == target_date,
                        TimeEntry.shift_type_id == shift.shift_type_id,
                    )
                ).first()

                if existing:
                    continue  # Skip if entry already exists

                # Create TimeEntry
                entry = TimeEntry(
                    id=uuid.uuid4(),
                    tenant_id=tenant_id,
                    employee_id=shift.employee_id,
                    shift_date=target_date,
                    start_time=start_time,
                    end_time=end_time,
                    hours_worked=hours_worked,
                    source=TimeEntrySource.SHIFT,
                    shift_record_id=shift.id,
                    shift_type_id=shift.shift_type_id,
                )

                db.add(entry)
                entries_created += 1

            db.commit()
            return entries_created

        except NoShiftsFoundError:
            raise  # Re-raise without wrapping
        except Exception as e:
            db.rollback()
            raise BatchProcessingError(f"Batch processing failed: {str(e)}")

    @staticmethod
    def get_employee_statistics(
        db: Session,
        tenant_id: uuid.UUID,
        employee_id: uuid.UUID,
        year: Optional[int] = None,
        month: Optional[int] = None,
        include_manual: bool = False,
    ) -> EmployeeStatisticsResponse:
        """Get work statistics for a specific employee.

        Args:
            db: Database session
            tenant_id: Tenant UUID
            employee_id: Employee UUID
            year: Year to query (default: current year)
            month: Month to query (1-12, default: current month)
            include_manual: Include manual entries in statistics

        Returns:
            EmployeeStatisticsResponse with aggregated statistics
        """
        if year is None:
            year = date_type.today().year
        if month is None:
            month = date_type.today().month

        from app.models.time_entry import TimeEntrySource

        query = select(TimeEntry).where(
            TimeEntry.tenant_id == tenant_id,
            TimeEntry.employee_id == employee_id,
            TimeEntry.shift_date >= date_type(year, month, 1),
        )

        if month == 12:
            end_date = date_type(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date_type(year, month + 1, 1) - timedelta(days=1)

        query = query.where(TimeEntry.shift_date <= end_date)

        if not include_manual:
            query = query.where(TimeEntry.source == TimeEntrySource.SHIFT)

        entries = db.exec(query).all()

        total_hours = sum(e.hours_worked for e in entries)
        days_worked = len(set(e.shift_date for e in entries))
        avg_hours = total_hours / days_worked if days_worked > 0 else Decimal(0)

        breakdown_by_shift = {}
        for entry in entries:
            shift_type_id = str(entry.shift_type_id) if entry.shift_type_id else "unknown"
            if shift_type_id not in breakdown_by_shift:
                breakdown_by_shift[shift_type_id] = Decimal(0)
            breakdown_by_shift[shift_type_id] += entry.hours_worked

        return EmployeeStatisticsResponse(
            employee_id=employee_id,
            period=f"{year}-{month:02d}",
            total_hours=total_hours,
            days_worked=days_worked,
            avg_hours_per_day=avg_hours,
            breakdown_by_shift_type=breakdown_by_shift,
        )

    @staticmethod
    def get_department_statistics(
        db: Session,
        tenant_id: uuid.UUID,
        year: Optional[int] = None,
        month: Optional[int] = None,
        department: Optional[str] = None,
        include_manual: bool = False,
    ) -> DepartmentStatisticsResponse:
        """Get aggregated statistics for a department.

        Args:
            db: Database session
            tenant_id: Tenant UUID
            year: Year to query
            month: Month to query
            department: Department name filter
            include_manual: Include manual entries

        Returns:
            DepartmentStatisticsResponse with department-level aggregations
        """
        if year is None:
            year = date_type.today().year
        if month is None:
            month = date_type.today().month

        if month == 12:
            end_date = date_type(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date_type(year, month + 1, 1) - timedelta(days=1)

        query = select(TimeEntry, Employee).where(
            TimeEntry.tenant_id == tenant_id,
            TimeEntry.employee_id == Employee.id,
            TimeEntry.shift_date >= date_type(year, month, 1),
            TimeEntry.shift_date <= end_date,
        )

        if department:
            query = query.where(Employee.department == department)

        if not include_manual:
            from app.models.time_entry import TimeEntrySource
            query = query.where(TimeEntry.source == TimeEntrySource.SHIFT)

        results = db.exec(query).all()

        total_hours = sum(r[0].hours_worked for r in results)
        unique_employees = len(set(r[0].employee_id for r in results))

        return DepartmentStatisticsResponse(
            department=department or "all",
            period=f"{year}-{month:02d}",
            total_hours=total_hours,
            unique_employees=unique_employees,
            avg_hours_per_employee=total_hours / unique_employees if unique_employees > 0 else Decimal(0),
        )

    @staticmethod
    def get_time_entries(
        db: Session,
        tenant_id: uuid.UUID,
        start_date: Optional[date_type] = None,
        end_date: Optional[date_type] = None,
        employee_id: Optional[uuid.UUID] = None,
        department: Optional[str] = None,
        source: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> TimeEntryListResponse:
        """Get paginated time entries with optional filters.

        Args:
            db: Database session
            tenant_id: Tenant UUID
            start_date: Start date filter
            end_date: End date filter
            employee_id: Filter by employee
            department: Filter by department
            source: Filter by source (shift/manual)
            limit: Max results per page
            offset: Page offset

        Returns:
            TimeEntryListResponse with paginated entries and metadata
        """
        if start_date is None:
            start_date = date_type.today() - timedelta(days=30)
        if end_date is None:
            end_date = date_type.today()

        query = (
            select(TimeEntry, Employee.first_name, Employee.last_name, Employee.dni)
            .join(Employee, TimeEntry.employee_id == Employee.id)
            .where(
                TimeEntry.tenant_id == tenant_id,
                TimeEntry.shift_date >= start_date,
                TimeEntry.shift_date <= end_date,
            )
        )

        if employee_id:
            query = query.where(TimeEntry.employee_id == employee_id)

        if source:
            from app.models.time_entry import TimeEntrySource
            source_enum = TimeEntrySource[source.upper()]
            query = query.where(TimeEntry.source == source_enum)

        if department:
            query = query.where(Employee.department == department)

        # Count total
        count_query = (
            select(func.count(TimeEntry.id))
            .join(Employee, TimeEntry.employee_id == Employee.id)
            .where(
                TimeEntry.tenant_id == tenant_id,
                TimeEntry.shift_date >= start_date,
                TimeEntry.shift_date <= end_date,
            )
        )
        if employee_id:
            count_query = count_query.where(TimeEntry.employee_id == employee_id)
        if source:
            from app.models.time_entry import TimeEntrySource
            source_enum = TimeEntrySource[source.upper()]
            count_query = count_query.where(TimeEntry.source == source_enum)
        if department:
            count_query = count_query.where(Employee.department == department)
        total = db.exec(count_query).one() or 0

        # Get paginated results
        rows = db.exec(query.order_by(TimeEntry.shift_date.desc()).offset(offset).limit(limit)).all()

        items = [
            TimeEntryResponse(
                id=entry.id,
                employee_id=entry.employee_id,
                employee_name=f"{first_name} {last_name}",
                employee_dni=dni,
                shift_date=entry.shift_date,
                start_time=entry.start_time,
                end_time=entry.end_time,
                hours_worked=entry.hours_worked,
                source=entry.source,
                shift_type_id=entry.shift_type_id,
                created_at=entry.created_at,
            )
            for entry, first_name, last_name, dni in rows
        ]

        return TimeEntryListResponse(
            items=items,
            total=total,
            limit=limit,
            offset=offset,
        )


# T021: Batch Job Wrapper for APScheduler
def run_daily_batch_job(db: Session, tenant_id: uuid.UUID, process_date: Optional[date_type] = None) -> dict[str, Any]:
    """Wrapper function called by APScheduler for daily automatic time entry generation.

    Args:
        db: Database session
        tenant_id: Tenant UUID to process
        process_date: Date to process (default: yesterday)

    Returns:
        Dictionary with job status: { tenant_id, entries_created, status, timestamp, message }

    Raises:
        Logs errors but does not raise to allow scheduler to continue
    """
    from datetime import datetime as dt_class
    import json

    if process_date is None:
        process_date = date_type.today() - timedelta(days=1)

    job_result = {
        "tenant_id": str(tenant_id),
        "process_date": process_date.isoformat(),
        "entries_created": 0,
        "status": "pending",
        "timestamp": dt_class.utcnow().isoformat(),
        "message": "",
    }

    try:
        # Log batch start
        print(json.dumps({
            "timestamp": dt_class.utcnow().isoformat(),
            "level": "INFO",
            "action": "batch_start",
            "tenant_id": str(tenant_id),
            "process_date": process_date.isoformat(),
        }))

        # Execute batch processing
        entries_created = TimeTrackingService.generate_time_entries_for_date(
            db=db,
            tenant_id=tenant_id,
            target_date=process_date,
        )

        job_result["entries_created"] = entries_created
        job_result["status"] = "completed"
        job_result["message"] = f"Successfully created {entries_created} time entries"

        # Log batch complete
        print(json.dumps({
            "timestamp": dt_class.utcnow().isoformat(),
            "level": "INFO",
            "action": "batch_complete",
            "tenant_id": str(tenant_id),
            "entries_created": entries_created,
            "process_date": process_date.isoformat(),
        }))

    except NoShiftsFoundError as e:
        job_result["status"] = "completed_no_shifts"
        job_result["message"] = f"No shifts found for {process_date}"
        # Log warning - this is not an error
        print(json.dumps({
            "timestamp": dt_class.utcnow().isoformat(),
            "level": "DEBUG",
            "action": "batch_no_shifts",
            "tenant_id": str(tenant_id),
            "process_date": process_date.isoformat(),
        }))

    except Exception as e:
        job_result["status"] = "error"
        job_result["message"] = f"Batch processing failed: {str(e)}"

        # Log error
        print(json.dumps({
            "timestamp": dt_class.utcnow().isoformat(),
            "level": "ERROR",
            "action": "batch_error",
            "tenant_id": str(tenant_id),
            "process_date": process_date.isoformat(),
            "error": str(e),
        }))

    return job_result
