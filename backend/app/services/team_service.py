"""T065: Team service with member management."""

import uuid
from datetime import datetime, timezone

from sqlmodel import Session, func, select

from app.common.exceptions import DuplicateError, NotFoundError, ValidationError
from app.models.employee import Employee
from app.models.team import Team
from app.models.vacation_request import VacationRequest
from app.schemas.team import TeamCreate, TeamMemberItem, TeamResponse, TeamUpdate


def _to_response(team: Team, session: Session) -> TeamResponse:
    members = session.exec(
        select(Employee).where(
            Employee.team_id == team.id,
            Employee.is_active == True,  # noqa: E712
        )
    ).all()
    return TeamResponse(
        id=team.id,
        name=team.name,
        department=team.department,
        shift_type=team.shift_type,
        shift_start=team.shift_start.isoformat() if team.shift_start else "",
        shift_end=team.shift_end.isoformat() if team.shift_end else "",
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
    from datetime import time as time_type

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

    team = Team(
        tenant_id=tenant_id,
        name=data.name,
        department=data.department,
        shift_type=data.shift_type,
        shift_start=time_type.fromisoformat(data.shift_start),
        shift_end=time_type.fromisoformat(data.shift_end),
    )
    session.add(team)
    session.commit()
    session.refresh(team)
    return _to_response(team, session)


def list_teams(
    tenant_id: uuid.UUID,
    session: Session,
    department: str | None = None,
    page: int = 1,
    size: int = 20,
) -> dict:
    query = select(Team).where(Team.tenant_id == tenant_id, Team.is_active == True)  # noqa: E712
    if department:
        query = query.where(Team.department == department)

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    offset = (page - 1) * size
    teams = session.exec(query.offset(offset).limit(size)).all()
    pages = (total + size - 1) // size if total > 0 else 1

    return {
        "items": [_to_response(t, session) for t in teams],
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


def get_by_id(
    team_id: uuid.UUID, tenant_id: uuid.UUID, session: Session
) -> TeamResponse:
    team = session.exec(
        select(Team).where(Team.id == team_id, Team.tenant_id == tenant_id)
    ).first()
    if not team:
        raise NotFoundError("Equipo no encontrado")
    return _to_response(team, session)


def update(
    team_id: uuid.UUID,
    data: TeamUpdate,
    tenant_id: uuid.UUID,
    session: Session,
) -> TeamResponse:
    from datetime import time as time_type

    team = session.exec(
        select(Team).where(Team.id == team_id, Team.tenant_id == tenant_id)
    ).first()
    if not team:
        raise NotFoundError("Equipo no encontrado")

    update_data = data.model_dump(exclude_unset=True)
    if "shift_start" in update_data and update_data["shift_start"]:
        update_data["shift_start"] = time_type.fromisoformat(update_data["shift_start"])
    if "shift_end" in update_data and update_data["shift_end"]:
        update_data["shift_end"] = time_type.fromisoformat(update_data["shift_end"])

    for key, value in update_data.items():
        setattr(team, key, value)
    team.updated_at = datetime.now(timezone.utc)

    session.add(team)
    session.commit()
    session.refresh(team)
    return _to_response(team, session)


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
    team.updated_at = datetime.now(timezone.utc)
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
    employee.updated_at = datetime.now(timezone.utc)
    session.add(employee)
    session.commit()
    session.refresh(team)
    return _to_response(team, session)


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
    employee.updated_at = datetime.now(timezone.utc)
    session.add(employee)
    session.commit()
    session.refresh(team)
    return _to_response(team, session)
