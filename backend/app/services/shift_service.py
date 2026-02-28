"""T066: Shift service with clock-in/clock-out management."""

import uuid
from datetime import UTC, date, datetime

from sqlmodel import Session, func, select

from app.common.exceptions import NotFoundError, ValidationError
from app.models.employee import Employee
from app.models.shift_record import ShiftRecord
from app.schemas.shift import ShiftRecordResponse


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
