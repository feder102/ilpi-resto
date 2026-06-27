"""T016: Team service — department string → FK (Feature 014)."""

import uuid
from datetime import UTC, datetime

from sqlmodel import Session, func, select

from app.common.exceptions import DuplicateError, NotFoundError, ValidationError
from app.models.department import Department
from app.models.employee import Employee
from app.models.shift_type import ShiftType
from app.models.team import Team
from app.models.vacation_request import VacationRequest
from app.schemas.department import DepartmentNestedResponse
from app.schemas.team import ShiftTypeDetail, TeamCreate, TeamMemberItem, TeamResponse, TeamUpdate


def _get_shift_type_detail(shift_type: ShiftType) -> ShiftTypeDetail:
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


def _get_department_nested(team: Team, session: Session) -> DepartmentNestedResponse:
    dept = session.get(Department, team.department_id)
    if dept is None:
        raise NotFoundError("Departamento del equipo no encontrado")
    return DepartmentNestedResponse(
        id=dept.id,
        name=dept.name,
        color=dept.color,
        icon=dept.icon,
        is_system=dept.is_system,
    )


def _to_response(team: Team, shift_type: ShiftType | None, session: Session) -> TeamResponse:
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
        department=_get_department_nested(team, session),
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


def _validate_department(
    department_id: uuid.UUID, tenant_id: uuid.UUID, session: Session
) -> Department:
    dept = session.exec(
        select(Department).where(
            Department.id == department_id,
            Department.tenant_id == tenant_id,
        )
    ).first()
    if not dept:
        raise NotFoundError("Departamento no encontrado o no pertenece al tenant")
    if not dept.is_active:
        raise ValidationError("No se puede asignar un departamento inactivo")
    return dept


def create(data: TeamCreate, tenant_id: uuid.UUID, session: Session) -> TeamResponse:
    # Validate department
    _validate_department(data.department_id, tenant_id, session)

    # Check for duplicate team name/department combination
    existing = session.exec(
        select(Team).where(
            Team.tenant_id == tenant_id,
            Team.name == data.name,
            Team.department_id == data.department_id,
        )
    ).first()
    if existing:
        raise DuplicateError(
            "Ya existe un equipo con este nombre en el departamento",
            "DUPLICATE_TEAM",
        )

    # Validate shift_type exists and is active
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
        department_id=data.department_id,
        shift_type_id=data.shift_type_id,
    )
    session.add(team)
    session.commit()
    session.refresh(team)
    return _to_response(team, shift_type, session)


def list_teams(
    tenant_id: uuid.UUID,
    session: Session,
    department_id: uuid.UUID | None = None,
    page: int = 1,
    size: int = 20,
) -> dict:
    query = select(Team).where(Team.tenant_id == tenant_id, Team.is_active == True)  # noqa: E712
    if department_id is not None:
        query = query.where(Team.department_id == department_id)

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    offset = (page - 1) * size
    teams = session.exec(query.offset(offset).limit(size)).all()
    pages = (total + size - 1) // size if total > 0 else 1

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
    team = session.exec(
        select(Team).where(Team.id == team_id, Team.tenant_id == tenant_id)
    ).first()
    if not team:
        raise NotFoundError("Equipo no encontrado")

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
    team = session.exec(
        select(Team).where(Team.id == team_id, Team.tenant_id == tenant_id)
    ).first()
    if not team:
        raise NotFoundError("Equipo no encontrado")

    update_data = data.model_dump(exclude_unset=True)

    # Validate department_id if changing
    if "department_id" in update_data and update_data["department_id"] is not None:
        _validate_department(update_data["department_id"], tenant_id, session)

    # Validate shift_type_id if changing
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
        raise ValidationError("El empleado está de vacaciones", "EMPLOYEE_ON_VACATION")

    employee.team_id = team_id
    employee.updated_at = datetime.now(UTC)
    session.add(employee)
    session.commit()
    session.refresh(team)

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

    shift_type = session.exec(
        select(ShiftType).where(ShiftType.id == team.shift_type_id)
    ).first()

    return _to_response(team, shift_type, session)
