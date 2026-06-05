"""Time Tracking Service for Features 008 & 010.

Feature 008: Automatic time entry tracking from shifts and statistics queries.
Feature 010: Admin-driven extra hours (overtime). Manual employee clock-in/out
has been removed; worked hours derive from assigned shifts (TimeEntry).
All read operations enforce tenant isolation; mutations enforce RBAC.
"""

import logging
import uuid
from datetime import UTC, datetime, timedelta
from datetime import date as date_type
from decimal import Decimal
from typing import Any, Optional

from sqlmodel import Session, func, select

from app.common.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.common.time_tracking_exceptions import (
    BatchProcessingError,
    HoursCalculationError,
    NoShiftsFoundError,
)
from app.models.employee import Employee
from app.models.shift_record import ShiftRecord
from app.models.shift_type import ShiftType
from app.models.time_entry import TimeEntry, TimeEntrySource
from app.schemas.time_tracking import (
    DepartmentStatisticsResponse,
    EmployeeStatisticsResponse,
    TimeEntryListResponse,
    TimeEntryResponse,
)

logger = logging.getLogger(__name__)


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
            raise HoursCalculationError(start_time, end_time, f"Failed to calculate hours: {str(e)}")

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

            # Preload all shift types for this tenant (avoids N+1)
            shift_type_ids = {s.shift_type_id for s in shifts if s.shift_type_id}
            shift_types_map: dict[uuid.UUID, ShiftType] = {}
            if shift_type_ids:
                shift_types_list = db.exec(
                    select(ShiftType).where(
                        ShiftType.id.in_(shift_type_ids),  # type: ignore[attr-defined]
                        ShiftType.tenant_id == tenant_id,
                    )
                ).all()
                shift_types_map = {st.id: st for st in shift_types_list}

            # Preload existing entries for this date (avoids N+1)
            existing_entries = db.exec(
                select(TimeEntry).where(
                    TimeEntry.tenant_id == tenant_id,
                    TimeEntry.shift_date == target_date,
                )
            ).all()
            existing_keys = {
                (e.employee_id, e.shift_type_id) for e in existing_entries
            }

            entries_created = 0

            for shift in shifts:
                if not shift.shift_type_id:
                    continue

                # Check for existing entry (idempotency) using preloaded set
                if (shift.employee_id, shift.shift_type_id) in existing_keys:
                    continue

                shift_type = shift_types_map.get(shift.shift_type_id)
                if not shift_type or not shift_type.time_windows:
                    continue

                # Parse time windows (supports single window or list of windows)
                windows = shift_type.time_windows if isinstance(shift_type.time_windows, list) else [shift_type.time_windows]

                # Use first window for start_time, last window for end_time
                first_start_str = windows[0].get('start') if windows else None
                last_end_str = windows[-1].get('end') if windows else None
                start_time = datetime.strptime(first_start_str, "%H:%M").time() if first_start_str else None
                end_time = datetime.strptime(last_end_str, "%H:%M").time() if last_end_str else None

                if not start_time or not end_time:
                    continue

                # Calculate total hours across all time windows
                hours_worked = Decimal(0)
                for window in windows:
                    w_start = window.get('start')
                    w_end = window.get('end')
                    if w_start and w_end:
                        w_start_time = datetime.strptime(w_start, "%H:%M").time()
                        w_end_time = datetime.strptime(w_end, "%H:%M").time()
                        hours_worked += TimeTrackingService._calculate_hours(w_start_time, w_end_time)

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
    def create_extra_hours(
        db: Session,
        tenant_id: uuid.UUID,
        current_user: dict,
        employee_id: uuid.UUID,
        work_date: date_type,
        hours: Decimal,
        note: Optional[str] = None,
    ) -> TimeEntryResponse:
        """Register extra hours (overtime) for an employee as a separate category.

        Only Admin/Moderador may create extra hours (RBAC enforced here).
        Extra entries use source=EXTRA with no schedule (start/end/shift_type are NULL).

        Args:
            db: Database session
            tenant_id: Tenant UUID (from the caller's JWT)
            current_user: JWT payload (for RBAC + audit)
            employee_id: Target employee UUID
            work_date: Date the extra hours apply to
            hours: Extra hours (> 0 and <= 24)
            note: Optional reason

        Returns:
            TimeEntryResponse for the created extra-hours entry

        Raises:
            ForbiddenError: Caller is not Admin/Moderador
            ValidationError: hours out of range
            NotFoundError: Employee not found in tenant
        """
        # RBAC: only Admin/Moderador can register extra hours
        if current_user.get("role") not in ("Admin", "Moderador"):
            raise ForbiddenError("Solo Admin o Moderador pueden cargar horas extra")

        if hours <= Decimal(0) or hours > Decimal(24):
            raise ValidationError(
                code="INVALID_EXTRA_HOURS",
                message="Las horas extra deben ser mayores que 0 y como máximo 24",
            )

        # Validate target employee exists and belongs to the caller's tenant
        employee = db.exec(
            select(Employee).where(
                Employee.id == employee_id,
                Employee.tenant_id == tenant_id,
            )
        ).first()
        if not employee:
            raise NotFoundError("Empleado no encontrado")

        hours_quantized = Decimal(hours).quantize(Decimal("0.00"))
        entry = TimeEntry(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            employee_id=employee_id,
            shift_date=work_date,
            start_time=None,
            end_time=None,
            hours_worked=hours_quantized,
            source=TimeEntrySource.EXTRA,
            note=note,
            shift_record_id=None,
            shift_type_id=None,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)

        # Audit log (security-relevant: manual hours mutation)
        logger.info(
            "Extra hours created",
            extra={
                "action": "create_extra_hours",
                "tenant_id": str(tenant_id),
                "actor_user_id": current_user.get("sub"),
                "actor_role": current_user.get("role"),
                "employee_id": str(employee_id),
                "work_date": work_date.isoformat(),
                "hours": str(hours_quantized),
            },
        )

        return TimeEntryResponse(
            id=entry.id,
            employee_id=entry.employee_id,
            employee_name=f"{employee.first_name} {employee.last_name}",
            employee_dni=employee.dni,
            shift_date=entry.shift_date,
            start_time=entry.start_time,
            end_time=entry.end_time,
            hours_worked=entry.hours_worked,
            source=entry.source,
            note=entry.note,
            shift_type_id=entry.shift_type_id,
            created_at=entry.created_at,
        )

    @staticmethod
    def delete_extra_hours(
        db: Session,
        tenant_id: uuid.UUID,
        current_user: dict,
        entry_id: uuid.UUID,
    ) -> None:
        """Delete an extra-hours entry (Admin/Moderador only).

        Only entries with source=EXTRA can be deleted (never shift entries).
        """
        if current_user.get("role") not in ("Admin", "Moderador"):
            raise ForbiddenError("Solo Admin o Moderador pueden eliminar horas extra")

        entry = db.exec(
            select(TimeEntry).where(
                TimeEntry.id == entry_id,
                TimeEntry.tenant_id == tenant_id,
            )
        ).first()
        if not entry or entry.source != TimeEntrySource.EXTRA:
            raise NotFoundError("Registro de horas extra no encontrado")

        db.delete(entry)
        db.commit()

        logger.info(
            "Extra hours deleted",
            extra={
                "action": "delete_extra_hours",
                "tenant_id": str(tenant_id),
                "actor_user_id": current_user.get("sub"),
                "actor_role": current_user.get("role"),
                "entry_id": str(entry_id),
            },
        )

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

        # Validate employee exists and belongs to tenant
        employee = db.exec(
            select(Employee).where(
                Employee.id == employee_id,
                Employee.tenant_id == tenant_id,
            )
        ).first()
        if not employee:
            raise NotFoundError("Empleado no encontrado")

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

        # Always include shift + extra hours. Legacy MANUAL entries are gated behind include_manual.
        if not include_manual:
            query = query.where(TimeEntry.source != TimeEntrySource.MANUAL)

        entries = db.exec(query).all()

        total_hours = sum((e.hours_worked for e in entries), Decimal(0))
        extra_hours = sum(
            (e.hours_worked for e in entries if e.source == TimeEntrySource.EXTRA),
            Decimal(0),
        )
        # "Días trabajados" cuenta fechas con turno (no las cargas de horas extra)
        days_worked = len({e.shift_date for e in entries if e.source != TimeEntrySource.EXTRA})
        shift_hours = total_hours - extra_hours
        avg_hours = shift_hours / days_worked if days_worked > 0 else Decimal(0)

        # Build breakdown keyed by shift type name for readability
        shift_type_ids = {e.shift_type_id for e in entries if e.shift_type_id}
        shift_type_names: dict[uuid.UUID, str] = {}
        if shift_type_ids:
            shift_types = db.exec(
                select(ShiftType).where(ShiftType.id.in_(shift_type_ids))  # type: ignore[attr-defined]
            ).all()
            shift_type_names = {st.id: st.name for st in shift_types}

        breakdown_by_shift: dict[str, Decimal] = {}
        for entry in entries:
            if entry.source == TimeEntrySource.EXTRA:
                key = "Horas extra"
            else:
                key = shift_type_names.get(entry.shift_type_id, "Sin tipo") if entry.shift_type_id else "Sin tipo"
            if key not in breakdown_by_shift:
                breakdown_by_shift[key] = Decimal(0)
            breakdown_by_shift[key] += entry.hours_worked

        return EmployeeStatisticsResponse(
            employee_id=employee_id,
            period=f"{year}-{month:02d}",
            total_hours=total_hours,
            extra_hours=extra_hours,
            days_worked=days_worked,
            avg_hours_per_day=avg_hours,
            breakdown_by_shift_type=breakdown_by_shift,
        )

    @staticmethod
    def get_employee_statistics_for_current_user(
        db: Session,
        tenant_id: uuid.UUID,
        employee_id: uuid.UUID,
        year: int,
        month: int,
    ) -> dict[str, Any]:
        """Get work statistics for the current logged-in employee.

        Returns total hours, weekly breakdown, and daily records with entry/exit times.
        Used by employee portal statistics view.

        Args:
            db: Database session
            tenant_id: Tenant UUID
            employee_id: Employee UUID (from JWT token)
            year: Year to query (1-indexed)
            month: Month to query (1-12)

        Returns:
            Dict with total_hours, weekly_breakdown, daily_records
        """
        # Validate employee exists and belongs to tenant
        employee = db.exec(
            select(Employee).where(
                Employee.id == employee_id,
                Employee.tenant_id == tenant_id,
            )
        ).first()
        if not employee:
            raise NotFoundError("Empleado no encontrado")

        # Calculate month boundaries
        if month == 12:
            end_date = date_type(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date_type(year, month + 1, 1) - timedelta(days=1)
        start_date = date_type(year, month, 1)

        # Query time entries for the month (shift hours + extra hours, excluding legacy manual)
        entries = db.exec(
            select(TimeEntry)
            .where(
                TimeEntry.tenant_id == tenant_id,
                TimeEntry.employee_id == employee_id,
                TimeEntry.shift_date >= start_date,
                TimeEntry.shift_date <= end_date,
                TimeEntry.source != TimeEntrySource.MANUAL,
            )
            .order_by(TimeEntry.shift_date)
        ).all()

        # Calculate totals (total includes extra; extra reported separately)
        total_hours = sum((e.hours_worked for e in entries), Decimal(0))
        extra_hours = sum(
            (e.hours_worked for e in entries if e.source == TimeEntrySource.EXTRA),
            Decimal(0),
        )

        # Build daily records (extra-hours entries have no entry/exit time)
        daily_records: list[dict[str, Any]] = []
        for entry in entries:
            is_extra = entry.source == TimeEntrySource.EXTRA
            daily_records.append({
                "date": entry.shift_date.isoformat(),
                "entry_time": entry.start_time.strftime("%H:%M") if entry.start_time else None,
                "exit_time": entry.end_time.strftime("%H:%M") if entry.end_time else None,
                "duration_hours": float(entry.hours_worked),
                "is_extra": is_extra,
                "note": entry.note if is_extra else None,
            })

        # Build weekly breakdown (includes extra hours so weekly totals match the monthly total)
        weekly_hours: dict[int, Decimal] = {}
        for entry in entries:
            # Get ISO calendar (year, week, weekday)
            _, iso_week, _ = entry.shift_date.isocalendar()

            week_key = iso_week
            if week_key not in weekly_hours:
                weekly_hours[week_key] = Decimal(0)
            weekly_hours[week_key] += entry.hours_worked

        weekly_breakdown = [
            {"week": week, "hours": float(hours)}
            for week, hours in sorted(weekly_hours.items())
        ]

        return {
            "total_hours": float(total_hours),
            "extra_hours": float(extra_hours),
            "weekly_breakdown": weekly_breakdown,
            "daily_records": daily_records,
        }

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

        # Include shift + extra hours; legacy MANUAL entries gated behind include_manual.
        if not include_manual:
            query = query.where(TimeEntry.source != TimeEntrySource.MANUAL)

        results = db.exec(query).all()

        total_hours = sum((r[0].hours_worked for r in results), Decimal(0))
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
                note=entry.note,
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
    if process_date is None:
        process_date = date_type.today() - timedelta(days=1)

    job_result: dict[str, Any] = {
        "tenant_id": str(tenant_id),
        "process_date": process_date.isoformat(),
        "entries_created": 0,
        "status": "pending",
        "timestamp": datetime.now(UTC).isoformat(),
        "message": "",
    }

    try:
        logger.info(
            "Batch processing started",
            extra={"action": "batch_start", "tenant_id": str(tenant_id), "process_date": process_date.isoformat()},
        )

        # Execute batch processing
        entries_created = TimeTrackingService.generate_time_entries_for_date(
            db=db,
            tenant_id=tenant_id,
            target_date=process_date,
        )

        job_result["entries_created"] = entries_created
        job_result["status"] = "completed"
        job_result["message"] = f"Successfully created {entries_created} time entries"

        logger.info(
            "Batch processing completed",
            extra={
                "action": "batch_complete",
                "tenant_id": str(tenant_id),
                "entries_created": entries_created,
                "process_date": process_date.isoformat(),
            },
        )

    except NoShiftsFoundError:
        job_result["status"] = "completed_no_shifts"
        job_result["message"] = f"No shifts found for {process_date}"
        logger.debug(
            "No shifts found for batch processing",
            extra={"action": "batch_no_shifts", "tenant_id": str(tenant_id), "process_date": process_date.isoformat()},
        )

    except Exception as e:
        job_result["status"] = "error"
        job_result["message"] = f"Batch processing failed: {str(e)}"
        logger.error(
            "Batch processing failed",
            exc_info=True,
            extra={
                "action": "batch_error",
                "tenant_id": str(tenant_id),
                "process_date": process_date.isoformat(),
                "error": str(e),
            },
        )

    return job_result
