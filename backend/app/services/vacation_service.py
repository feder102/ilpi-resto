"""T055: Vacation service with request management and balance tracking."""

import uuid
from datetime import UTC, date, datetime

from sqlmodel import Session, and_, func, select

from app.common.exceptions import (
    BalanceExceededError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
)
from app.models.employee import Employee
from app.models.vacation_balance import VacationBalance
from app.models.vacation_request import VacationRequest
from app.schemas.vacation import VacationBalanceResponse, VacationRequestResponse


def _to_response(req: VacationRequest, session: Session) -> VacationRequestResponse:
    emp = session.get(Employee, req.employee_id)
    return VacationRequestResponse(
        id=req.id,
        employee_id=req.employee_id,
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
        employee_image=emp.profile_image if emp else None,
        employee_department=emp.department if emp else None,
        start_date=req.start_date,
        end_date=req.end_date,
        requested_days=req.requested_days,
        status=req.status,
        reviewed_by=req.reviewed_by,
        reviewed_at=req.reviewed_at.isoformat() if req.reviewed_at else None,
        version=req.version,
        created_at=req.created_at.isoformat(),
    )


def _get_or_create_balance(
    employee_id: uuid.UUID, year: int, tenant_id: uuid.UUID, session: Session
) -> VacationBalance:
    balance = session.exec(
        select(VacationBalance).where(
            VacationBalance.tenant_id == tenant_id,
            VacationBalance.employee_id == employee_id,
            VacationBalance.year == year,
        )
    ).first()
    if not balance:
        balance = VacationBalance(
            tenant_id=tenant_id,
            employee_id=employee_id,
            year=year,
        )
        session.add(balance)
        session.flush()
    return balance


def create_request(
    employee_id: uuid.UUID,
    start_date: date,
    end_date: date,
    tenant_id: uuid.UUID,
    session: Session,
) -> VacationRequestResponse:
    if start_date > end_date:
        raise ValidationError("La fecha de inicio debe ser anterior a la de fin")

    requested_days = (end_date - start_date).days + 1
    year = start_date.year

    balance = _get_or_create_balance(employee_id, year, tenant_id, session)
    remaining = balance.total_days - balance.used_days

    if requested_days > remaining:
        raise BalanceExceededError(
            f"Saldo insuficiente. Días disponibles: {remaining}"
        )

    req = VacationRequest(
        tenant_id=tenant_id,
        employee_id=employee_id,
        start_date=start_date,
        end_date=end_date,
        requested_days=requested_days,
        status="Pendiente",
    )
    session.add(req)
    session.commit()
    session.refresh(req)
    return _to_response(req, session)


def approve(
    request_id: uuid.UUID,
    version: int,
    reviewer_user_id: uuid.UUID,
    tenant_id: uuid.UUID,
    session: Session,
) -> VacationRequestResponse:
    req = session.exec(
        select(VacationRequest).where(
            VacationRequest.id == request_id,
            VacationRequest.tenant_id == tenant_id,
        )
    ).first()
    if not req:
        raise NotFoundError("Solicitud no encontrada")

    if req.version != version:
        raise ConflictError("La solicitud fue modificada por otro usuario")

    if req.status != "Pendiente":
        raise ValidationError("Solo se pueden aprobar solicitudes pendientes")

    balance = _get_or_create_balance(
        req.employee_id, req.start_date.year, tenant_id, session
    )
    remaining = balance.total_days - balance.used_days
    if req.requested_days > remaining:
        raise BalanceExceededError(
            f"Saldo insuficiente. Días disponibles: {remaining}"
        )

    req.status = "Aprobado"
    req.reviewed_by = reviewer_user_id
    req.reviewed_at = datetime.now(UTC)
    req.version += 1
    req.updated_at = datetime.now(UTC)

    balance.used_days += req.requested_days
    balance.updated_at = datetime.now(UTC)

    session.add(req)
    session.add(balance)
    session.commit()
    session.refresh(req)
    return _to_response(req, session)


def reject(
    request_id: uuid.UUID,
    version: int,
    reviewer_user_id: uuid.UUID,
    tenant_id: uuid.UUID,
    session: Session,
) -> VacationRequestResponse:
    req = session.exec(
        select(VacationRequest).where(
            VacationRequest.id == request_id,
            VacationRequest.tenant_id == tenant_id,
        )
    ).first()
    if not req:
        raise NotFoundError("Solicitud no encontrada")

    if req.version != version:
        raise ConflictError("La solicitud fue modificada por otro usuario")

    # If rejecting a previously approved request, restore balance
    if req.status == "Aprobado":
        balance = _get_or_create_balance(
            req.employee_id, req.start_date.year, tenant_id, session
        )
        balance.used_days = max(0, balance.used_days - req.requested_days)
        balance.updated_at = datetime.now(UTC)
        session.add(balance)

    req.status = "Rechazado"
    req.reviewed_by = reviewer_user_id
    req.reviewed_at = datetime.now(UTC)
    req.version += 1
    req.updated_at = datetime.now(UTC)

    session.add(req)
    session.commit()
    session.refresh(req)
    return _to_response(req, session)


def cancel(
    request_id: uuid.UUID,
    version: int,
    employee_id: uuid.UUID,
    tenant_id: uuid.UUID,
    session: Session,
) -> VacationRequestResponse:
    req = session.exec(
        select(VacationRequest).where(
            VacationRequest.id == request_id,
            VacationRequest.tenant_id == tenant_id,
        )
    ).first()
    if not req:
        raise NotFoundError("Solicitud no encontrada")

    if req.version != version:
        raise ConflictError("La solicitud fue modificada por otro usuario")

    if req.employee_id != employee_id:
        raise ForbiddenError("Solo puede cancelar sus propias solicitudes")

    if req.status != "Pendiente":
        raise ValidationError("Solo se pueden cancelar solicitudes pendientes")

    req.status = "Cancelado"
    req.version += 1
    req.updated_at = datetime.now(UTC)

    session.add(req)
    session.commit()
    session.refresh(req)
    return _to_response(req, session)


def get_balance(
    employee_id: uuid.UUID,
    year: int,
    tenant_id: uuid.UUID,
    session: Session,
) -> VacationBalanceResponse:
    balance = _get_or_create_balance(employee_id, year, tenant_id, session)
    session.commit()
    return VacationBalanceResponse(
        employee_id=balance.employee_id,
        year=balance.year,
        total_days=balance.total_days,
        used_days=balance.used_days,
        remaining_days=balance.total_days - balance.used_days,
    )


def list_requests(
    tenant_id: uuid.UUID,
    session: Session,
    employee_id: uuid.UUID | None = None,
    status_filter: str | None = None,
    page: int = 1,
    size: int = 20,
) -> dict:
    query = select(VacationRequest).where(VacationRequest.tenant_id == tenant_id)

    if employee_id:
        query = query.where(VacationRequest.employee_id == employee_id)
    if status_filter:
        query = query.where(VacationRequest.status == status_filter)

    query = query.order_by(VacationRequest.created_at.desc())  # type: ignore[union-attr]

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    offset = (page - 1) * size
    requests = session.exec(query.offset(offset).limit(size)).all()
    pages = (total + size - 1) // size if total > 0 else 1

    return {
        "items": [_to_response(r, session) for r in requests],
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


# T011: Moderator-specific convenience methods
def get_request_by_id(
    request_id: uuid.UUID,
    tenant_id: uuid.UUID,
    session: Session,
) -> VacationRequest:
    """Get vacation request by ID (used by moderator endpoints)."""
    req = session.exec(
        select(VacationRequest).where(
            VacationRequest.id == request_id,
            VacationRequest.tenant_id == tenant_id,
        )
    ).first()
    if not req:
        raise NotFoundError("Solicitud de vacaciones no encontrada")
    return req


def approve_request(
    request_id: uuid.UUID,
    reviewer_user_id: uuid.UUID,
    tenant_id: uuid.UUID,
    session: Session,
) -> VacationRequestResponse:
    """
    Moderator-friendly approval method (gets current version automatically).

    Used by moderator portal to approve vacation requests.
    """
    req = get_request_by_id(request_id, tenant_id, session)
    return approve(request_id, req.version, reviewer_user_id, tenant_id, session)


def reject_request(
    request_id: uuid.UUID,
    reviewer_user_id: uuid.UUID,
    tenant_id: uuid.UUID,
    session: Session,
    reason: str | None = None,
) -> VacationRequestResponse:
    """
    Moderator-friendly rejection method (gets current version automatically).

    Used by moderator portal to reject vacation requests.

    Args:
        request_id: Request ID
        reviewer_user_id: Moderator user ID
        tenant_id: Tenant ID
        session: Database session
        reason: Optional rejection reason
    """
    req = get_request_by_id(request_id, tenant_id, session)

    if req.status != "Pendiente":
        raise ValidationError("Solo se pueden rechazar solicitudes pendientes")

    # Store rejection reason
    if reason:
        req.rejection_reason = reason

    return reject(request_id, req.version, reviewer_user_id, tenant_id, session)


# T031: Get pending requests for moderator's department
def get_department_pending_requests(
    tenant_id: uuid.UUID,
    department: str,
    session: Session,
    status_filter: str | None = None,
    employee_id: uuid.UUID | None = None,
) -> list[VacationRequestResponse]:
    """
    Get pending vacation requests from moderator's department.

    Used by: GET /moderator/vacations/pending

    Args:
        tenant_id: Tenant ID
        department: Department name to filter by
        session: Database session
        status_filter: Optional status filter (Pendiente, Aprobado, Rechazado)
        employee_id: Optional employee filter

    Returns:
        List of vacation requests for the department
    """
    from app.models import Employee

    # Query vacation requests for employees in this department
    query = (
        select(VacationRequest)
        .join(Employee, VacationRequest.employee_id == Employee.id)
        .where(
            and_(
                VacationRequest.tenant_id == tenant_id,
                Employee.department == department,
            )
        )
    )

    # Apply filters
    if status_filter:
        query = query.where(VacationRequest.status == status_filter)
    if employee_id:
        query = query.where(VacationRequest.employee_id == employee_id)

    query = query.order_by(VacationRequest.created_at.desc())

    requests = session.exec(query).all()
    return [_to_response(r, session) for r in requests]


# T033: Get vacation request details with balance
def get_vacation_request_details(
    request_id: uuid.UUID,
    tenant_id: uuid.UUID,
    session: Session,
) -> dict:
    """
    T033: Get detailed information about a specific vacation request.

    Includes employee details, requested dates, days count, and
    current vacation balance.

    Used by: GET /moderator/vacations/{request_id}

    Args:
        request_id: Vacation request ID
        tenant_id: Tenant ID
        session: Database session

    Returns:
        {
            "id": str,
            "employee_id": str,
            "employee": {
                "name": str,
                "department": str,
                "hire_date": str (ISO)
            },
            "start_date": str (ISO),
            "end_date": str (ISO),
            "requested_days": int,
            "status": str,
            "balance": {
                "year": int,
                "total_days": int,
                "used_days": int,
                "remaining_days": int
            },
            "created_at": str (ISO)
        }
    """
    req = get_request_by_id(request_id, tenant_id, session)

    # Get employee info
    employee = session.get(Employee, req.employee_id)
    if not employee:
        raise NotFoundError("Empleado no encontrado")

    # Get vacation balance for this year
    balance = _get_or_create_balance(
        req.employee_id, req.start_date.year, tenant_id, session
    )

    return {
        "id": str(req.id),
        "employee_id": str(req.employee_id),
        "employee": {
            "name": f"{employee.first_name} {employee.last_name}",
            "department": employee.department,
            "hire_date": employee.hire_date.isoformat() if employee.hire_date else None,
        },
        "start_date": req.start_date.isoformat(),
        "end_date": req.end_date.isoformat(),
        "requested_days": req.requested_days,
        "status": req.status,
        "balance": {
            "year": balance.year,
            "total_days": balance.total_days,
            "used_days": balance.used_days,
            "remaining_days": balance.total_days - balance.used_days,
        },
        "created_at": req.created_at.isoformat(),
    }
