"""Absence Service - Manages employee absences on assigned shift days."""

import logging
import uuid
from datetime import date as date_type

from sqlmodel import Session, select

from app.common.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.models.absence import Absence
from app.models.employee import Employee
from app.models.shift_record import ShiftRecord
from app.models.time_entry import TimeEntry, TimeEntrySource
from app.schemas.time_tracking import AbsenceListResponse, AbsenceResponse

logger = logging.getLogger(__name__)


class AbsenceService:
    """Service for managing employee absences on assigned shift days."""

    @staticmethod
    def create_absence(
        db: Session,
        tenant_id: uuid.UUID,
        current_user: dict,
        employee_id: uuid.UUID,
        absence_date: date_type,
        justified: bool = False,
        reason: str | None = None,
    ) -> AbsenceResponse:
        """Register an absence for an employee on a day they had an assigned shift.

        Only Admin/Moderador may create absences (RBAC enforced here).
        Deletes the existing SHIFT TimeEntry for that day so hours/days drop immediately.

        Raises:
            ForbiddenError: Caller is not Admin/Moderador
            NotFoundError: Employee not found in tenant
            ValidationError: No shift assigned on that date, or absence already exists
        """
        if current_user.get("role") not in ("Admin", "Moderador"):
            raise ForbiddenError("Solo Admin o Moderador pueden registrar ausencias")

        employee = db.exec(
            select(Employee).where(
                Employee.id == employee_id,
                Employee.tenant_id == tenant_id,
            )
        ).first()
        if not employee:
            raise NotFoundError("Empleado no encontrado")

        shift = db.exec(
            select(ShiftRecord).where(
                ShiftRecord.tenant_id == tenant_id,
                ShiftRecord.employee_id == employee_id,
                ShiftRecord.date == absence_date,
            )
        ).first()
        if not shift:
            raise ValidationError(
                code="NO_SHIFT_ON_DATE",
                message="El empleado no tiene un turno asignado en esa fecha",
            )

        existing = db.exec(
            select(Absence).where(
                Absence.tenant_id == tenant_id,
                Absence.employee_id == employee_id,
                Absence.date == absence_date,
            )
        ).first()
        if existing:
            raise ValidationError(
                code="ABSENCE_ALREADY_EXISTS",
                message="Ya existe una ausencia registrada para esa fecha",
            )

        absence = Absence(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            employee_id=employee_id,
            date=absence_date,
            shift_record_id=shift.id,
            justified=justified,
            reason=reason,
            created_by=uuid.UUID(current_user["sub"]) if current_user.get("sub") else None,
        )
        db.add(absence)

        # Delete existing SHIFT TimeEntry for that day so stats drop immediately
        existing_entry = db.exec(
            select(TimeEntry).where(
                TimeEntry.tenant_id == tenant_id,
                TimeEntry.employee_id == employee_id,
                TimeEntry.shift_date == absence_date,
                TimeEntry.source == TimeEntrySource.SHIFT,
            )
        ).first()
        if existing_entry:
            db.delete(existing_entry)

        db.commit()
        db.refresh(absence)

        logger.info(
            "Absence created",
            extra={
                "action": "create_absence",
                "tenant_id": str(tenant_id),
                "actor_user_id": current_user.get("sub"),
                "actor_role": current_user.get("role"),
                "employee_id": str(employee_id),
                "absence_date": absence_date.isoformat(),
                "justified": justified,
            },
        )

        return AbsenceResponse(
            id=absence.id,
            employee_id=absence.employee_id,
            employee_name=f"{employee.first_name} {employee.last_name}",
            employee_dni=employee.dni,
            date=absence.date,
            justified=absence.justified,
            reason=absence.reason,
            created_at=absence.created_at,
        )

    @staticmethod
    def delete_absence(
        db: Session,
        tenant_id: uuid.UUID,
        current_user: dict,
        absence_id: uuid.UUID,
    ) -> None:
        """Delete an absence record (Admin/Moderador only).

        Regenerates the SHIFT TimeEntry for that day after deletion.
        """
        if current_user.get("role") not in ("Admin", "Moderador"):
            raise ForbiddenError("Solo Admin o Moderador pueden eliminar ausencias")

        absence = db.exec(
            select(Absence).where(
                Absence.id == absence_id,
                Absence.tenant_id == tenant_id,
            )
        ).first()
        if not absence:
            raise NotFoundError("Ausencia no encontrada")

        absence_date = absence.date
        employee_id = absence.employee_id

        db.delete(absence)
        db.commit()

        # Regenerate the SHIFT TimeEntry for that day
        try:
            from app.services.time_tracking_service import TimeTrackingService  # noqa: PLC0415
            TimeTrackingService.generate_time_entries_for_date(
                db=db,
                tenant_id=tenant_id,
                target_date=absence_date,
            )
        except Exception:  # noqa: BLE001
            pass  # Don't block deletion if regeneration fails

        logger.info(
            "Absence deleted",
            extra={
                "action": "delete_absence",
                "tenant_id": str(tenant_id),
                "actor_user_id": current_user.get("sub"),
                "actor_role": current_user.get("role"),
                "absence_id": str(absence_id),
                "employee_id": str(employee_id),
                "absence_date": absence_date.isoformat(),
            },
        )

    @staticmethod
    def list_absences(
        db: Session,
        tenant_id: uuid.UUID,
        employee_id: uuid.UUID | None = None,
        year: int | None = None,
        month: int | None = None,
    ) -> AbsenceListResponse:
        """List absences with optional filters."""
        from datetime import timedelta

        query = select(Absence, Employee).where(
            Absence.tenant_id == tenant_id,
            Absence.employee_id == Employee.id,
        )

        if employee_id:
            query = query.where(Absence.employee_id == employee_id)

        if year and month:
            start = date_type(year, month, 1)
            if month == 12:
                end = date_type(year + 1, 1, 1) - timedelta(days=1)
            else:
                end = date_type(year, month + 1, 1) - timedelta(days=1)
            query = query.where(Absence.date >= start, Absence.date <= end)

        results = db.exec(query.order_by(Absence.date.desc())).all()  # type: ignore[arg-type]

        items = [
            AbsenceResponse(
                id=absence.id,
                employee_id=absence.employee_id,
                employee_name=f"{emp.first_name} {emp.last_name}",
                employee_dni=emp.dni,
                date=absence.date,
                justified=absence.justified,
                reason=absence.reason,
                created_at=absence.created_at,
            )
            for absence, emp in results
        ]

        return AbsenceListResponse(total=len(items), items=items)

    @staticmethod
    def count_absences_for_period(
        db: Session,
        tenant_id: uuid.UUID,
        employee_id: uuid.UUID,
        start_date: date_type,
        end_date: date_type,
    ) -> tuple[int, int, int]:
        """Return (total, justified, unjustified) absences for a period."""
        absences = db.exec(
            select(Absence).where(
                Absence.tenant_id == tenant_id,
                Absence.employee_id == employee_id,
                Absence.date >= start_date,
                Absence.date <= end_date,
            )
        ).all()
        total = len(absences)
        justified = sum(1 for a in absences if a.justified)
        return total, justified, total - justified
