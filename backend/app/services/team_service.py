"""T065: Team service with member management and shift type integration."""

import uuid
from datetime import UTC, datetime

from sqlmodel import Session, func, select

from app.common.exceptions import DuplicateError, NotFoundError, ValidationError
from app.models.employee import Employee
from app.models.shift_type import ShiftType
from app.models.team import Team
from app.models.vacation_request import VacationRequest
from app.schemas.team import ShiftTypeDetail, TeamCreate, TeamMemberItem, TeamResponse, TeamUpdate


def _get_shift_type_detail(shift_type: ShiftType) -> ShiftTypeDetail:
    """Convert ShiftType model to response detail."""
    return ShiftTypeDetail(
        id=shift_type.id,
        name=shift_type.name,
        type=shift_type.type,
        time_windows=shift_type.time_windows,
        expected_hours=shift_type.expected_hours,
        total_hours=shift_type.total_hours,
        uses_dynamic_close=shift_type.uses_dynamic_close,
        description=shift_type.description,
    )


def _to_response(team: Team, shift_type: ShiftType | None, session: Session) -> TeamResponse:
    """Convert team to response with shift type details."""
    members = session.exec(
        select(Employee).where(
            Employee.team_id == team.id,
            Employee.is_active == True,  # noqa: E712
        )
    ).all()

    shift_detail = _get_shift_type_detail(shift_type) if shift_type else None

    return TeamResponse(
        id=team.id,
        name=team.name,
        department=team.department,
        shift_type_id=team.shift_type_id,
        shift_type=shift_detail,
        time_windows=shift_type.time_windows if shift_type else None,
        total_hours=shift_type.total_hours if shift_type else None,
        expected_hours=shift_type.expected_hours if shift_type else None,
        uses_dynamic_close=shift_type.uses_dynamic_close if shift_type else None,
        is_active=team.is_active,
        members=[
            TeamMemberItem(
                id=m.id,
                first_name=m.first_name,
                last_name=m.last_name,
                profile_image=m.profile_image,
            )
            for m in members
        ],
    )


def create(data: TeamCreate, tenant_id: uuid.UUID, session: Session) -> TeamResponse:
    """Create team with shift type reference.

    T045: Validate shift_type_id exists and is active.
    """
    # Check for duplicate team name/department combination
    existing = session.exec(
        select(Team).where(
            Team.tenant_id == tenant_id,
            Team.name == data.name,
            Team.department == data.department,
        )
    ).first()
    if existing:
        raise DuplicateError(
            "Ya existe un equipo con este nombre en el departamento",
            "DUPLICATE_TEAM",
        )

    # T051: Validate shift_type exists and is active
    shift_type = session.exec(
        select(ShiftType).where(
            ShiftType.id == data.shift_type_id,
            ShiftType.tenant_id == tenant_id,
            ShiftType.is_active == True,  # noqa: E712
        )
    ).first()
    if not shift_type:
        raise ValidationError("El tipo de turno especificado no existe o está inactivo")

    team = Team(
        tenant_id=tenant_id,
        name=data.name,
        department=data.department,
        shift_type_id=data.shift_type_id,
    )
    session.add(team)
    session.commit()
    session.refresh(team)
    return _to_response(team, shift_type, session)


def list_teams(
    tenant_id: uuid.UUID,
    session: Session,
    department: str | None = None,
    page: int = 1,
    size: int = 20,
) -> dict:
    """T048: List teams with shift type details."""
    query = select(Team).where(Team.tenant_id == tenant_id, Team.is_active == True)  # noqa: E712
    if department:
        query = query.where(Team.department == department)

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    offset = (page - 1) * size
    teams = session.exec(query.offset(offset).limit(size)).all()
    pages = (total + size - 1) // size if total > 0 else 1

    # Get shift types for all teams
    responses = []
    for t in teams:
        shift_type = session.exec(
            select(ShiftType).where(ShiftType.id == t.shift_type_id)
        ).first()
        responses.append(_to_response(t, shift_type, session))

    return {
        "items": responses,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


def get_by_id(
    team_id: uuid.UUID, tenant_id: uuid.UUID, session: Session
) -> TeamResponse:
    """T049: Get team by ID with shift type details."""
    team = session.exec(
        select(Team).where(Team.id == team_id, Team.tenant_id == tenant_id)
    ).first()
    if not team:
        raise NotFoundError("Equipo no encontrado")

    # Get associated shift type
    shift_type = session.exec(
        select(ShiftType).where(ShiftType.id == team.shift_type_id)
    ).first()

    return _to_response(team, shift_type, session)


def update(
    team_id: uuid.UUID,
    data: TeamUpdate,
    tenant_id: uuid.UUID,
    session: Session,
) -> TeamResponse:
    """T050: Update team with shift_type_id support.

    T046: Validate shift_type_id on changes.
    """
    team = session.exec(
        select(Team).where(Team.id == team_id, Team.tenant_id == tenant_id)
    ).first()
    if not team:
        raise NotFoundError("Equipo no encontrado")

    update_data = data.model_dump(exclude_unset=True)

    # T046: Validate shift_type_id if changing
    if "shift_type_id" in update_data and update_data["shift_type_id"]:
        shift_type = session.exec(
            select(ShiftType).where(
                ShiftType.id == update_data["shift_type_id"],
                ShiftType.tenant_id == tenant_id,
                ShiftType.is_active == True,  # noqa: E712
            )
        ).first()
        if not shift_type:
            raise ValidationError("El tipo de turno especificado no existe o está inactivo")

    for key, value in update_data.items():
        setattr(team, key, value)
    team.updated_at = datetime.now(UTC)

    session.add(team)
    session.commit()
    session.refresh(team)

    # Get updated shift type for response
    shift_type = session.exec(
        select(ShiftType).where(ShiftType.id == team.shift_type_id)
    ).first()

    return _to_response(team, shift_type, session)


def delete(
    team_id: uuid.UUID, tenant_id: uuid.UUID, session: Session
) -> dict:
    team = session.exec(
        select(Team).where(Team.id == team_id, Team.tenant_id == tenant_id)
    ).first()
    if not team:
        raise NotFoundError("Equipo no encontrado")

    # Remove team assignment from members
    members = session.exec(
        select(Employee).where(Employee.team_id == team_id)
    ).all()
    for m in members:
        m.team_id = None
        session.add(m)

    team.is_active = False
    team.updated_at = datetime.now(UTC)
    session.add(team)
    session.commit()
    return {"message": "Equipo eliminado"}


def add_member(
    team_id: uuid.UUID,
    employee_id: uuid.UUID,
    tenant_id: uuid.UUID,
    session: Session,
) -> TeamResponse:
    team = session.exec(
        select(Team).where(Team.id == team_id, Team.tenant_id == tenant_id)
    ).first()
    if not team:
        raise NotFoundError("Equipo no encontrado")

    employee = session.exec(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.tenant_id == tenant_id,
            Employee.is_active == True,  # noqa: E712
        )
    ).first()
    if not employee:
        raise NotFoundError("Empleado no encontrado")

    # Check if employee is on vacation
    from datetime import date

    today = date.today()
    on_vacation = session.exec(
        select(VacationRequest).where(
            VacationRequest.employee_id == employee_id,
            VacationRequest.status == "Aprobado",
            VacationRequest.start_date <= today,
            VacationRequest.end_date >= today,
        )
    ).first()
    if on_vacation:
        raise ValidationError(
            "El empleado está de vacaciones", "EMPLOYEE_ON_VACATION"
        )

    employee.team_id = team_id
    employee.updated_at = datetime.now(UTC)
    session.add(employee)
    session.commit()
    session.refresh(team)

    # Get shift type for response
    shift_type = session.exec(
        select(ShiftType).where(ShiftType.id == team.shift_type_id)
    ).first()

    return _to_response(team, shift_type, session)


def remove_member(
    team_id: uuid.UUID,
    employee_id: uuid.UUID,
    tenant_id: uuid.UUID,
    session: Session,
) -> TeamResponse:
    team = session.exec(
        select(Team).where(Team.id == team_id, Team.tenant_id == tenant_id)
    ).first()
    if not team:
        raise NotFoundError("Equipo no encontrado")

    employee = session.exec(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.team_id == team_id,
        )
    ).first()
    if not employee:
        raise NotFoundError("Empleado no encontrado en el equipo")

    employee.team_id = None
    employee.updated_at = datetime.now(UTC)
    session.add(employee)
    session.commit()
    session.refresh(team)

    # Get shift type for response
    shift_type = session.exec(
        select(ShiftType).where(ShiftType.id == team.shift_type_id)
    ).first()

    return _to_response(team, shift_type, session)
