"""T008/T030/T041/T052/T053: Department service — ABM de Departamentos (Feature 014)."""

import logging
import uuid
from datetime import UTC, datetime

from sqlmodel import Session, func, select

from app.common.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.models.department import Department
from app.schemas.department import (
    DepartmentCreate,
    DepartmentDeletePreview,
    DepartmentDeleteResult,
    DepartmentListResponse,
    DepartmentNestedResponse,
    DepartmentResponse,
    DepartmentUpdate,
)

security_logger = logging.getLogger("security")

_SYSTEM_DEPT_ERROR = ForbiddenError(
    "El departamento del sistema no puede ser modificado ni eliminado"
)


def _to_nested(dept: Department) -> DepartmentNestedResponse:
    return DepartmentNestedResponse(
        id=dept.id,
        name=dept.name,
        color=dept.color,
        icon=dept.icon,
        is_system=dept.is_system,
    )


def _to_response(
    dept: Department,
    employee_count: int | None = None,
    team_count: int | None = None,
) -> DepartmentResponse:
    return DepartmentResponse(
        id=dept.id,
        name=dept.name,
        description=dept.description,
        color=dept.color,
        icon=dept.icon,
        is_system=dept.is_system,
        is_active=dept.is_active,
        employee_count=employee_count,
        team_count=team_count,
        created_at=dept.created_at,
        updated_at=dept.updated_at,
    )


def _assert_not_system(dept: Department) -> None:
    if dept.is_system:
        security_logger.warning(
            "department.system_protected_attempt",
            extra={"department_id": str(dept.id), "name": dept.name},
        )
        raise ForbiddenError(
            "El departamento del sistema no puede ser modificado ni eliminado"
        )


def _assert_unique_name(
    name: str,
    tenant_id: uuid.UUID,
    session: Session,
    exclude_id: uuid.UUID | None = None,
) -> None:
    query = select(Department).where(
        Department.tenant_id == tenant_id,
        func.lower(Department.name) == name.lower(),  # type: ignore[arg-type]
    )
    if exclude_id is not None:
        query = query.where(Department.id != exclude_id)
    existing = session.exec(query).first()
    if existing:
        security_logger.warning(
            "department.name_conflict",
            extra={"tenant_id": str(tenant_id), "name": name},
        )
        raise ConflictError("Ya existe un departamento con ese nombre en este tenant")


def _get_counts(
    dept_id: uuid.UUID, session: Session
) -> tuple[int, int]:
    from app.models.employee import Employee
    from app.models.team import Team

    emp_count = session.exec(
        select(func.count()).select_from(
            select(Employee).where(Employee.department_id == dept_id).subquery()
        )
    ).one()
    team_count = session.exec(
        select(func.count()).select_from(
            select(Team).where(Team.department_id == dept_id).subquery()
        )
    ).one()
    return int(emp_count), int(team_count)


def ensure_system_department(tenant_id: uuid.UUID, session: Session) -> Department:
    """Idempotently return (or create) the 'Sin asignar' department for the tenant."""
    dept = session.exec(
        select(Department).where(
            Department.tenant_id == tenant_id,
            Department.is_system == True,  # noqa: E712
        )
    ).first()
    if dept is None:
        dept = Department(
            tenant_id=tenant_id,
            name="Sin asignar",
            color="#9ca3af",
            icon="CircleHelp",
            is_system=True,
            is_active=True,
        )
        session.add(dept)
        session.flush()
    return dept


def list_departments(
    tenant_id: uuid.UUID,
    session: Session,
    include_inactive: bool = False,
    search: str | None = None,
    is_admin: bool = False,
) -> DepartmentListResponse:
    query = select(Department).where(Department.tenant_id == tenant_id)

    if not include_inactive:
        query = query.where(Department.is_active == True)  # noqa: E712

    if search:
        pattern = f"%{search}%"
        query = query.where(Department.name.ilike(pattern))  # type: ignore[union-attr]

    departments = session.exec(query.order_by(Department.is_system.desc(), Department.name)).all()  # type: ignore[union-attr]
    total = len(departments)

    items: list[DepartmentResponse] = []
    for dept in departments:
        emp_count, team_count = _get_counts(dept.id, session) if is_admin else (None, None)
        items.append(_to_response(dept, emp_count, team_count))

    return DepartmentListResponse(items=items, total=total)


def get_by_id(
    department_id: uuid.UUID,
    tenant_id: uuid.UUID,
    session: Session,
    is_admin: bool = False,
) -> DepartmentResponse:
    dept = session.exec(
        select(Department).where(
            Department.id == department_id,
            Department.tenant_id == tenant_id,
        )
    ).first()
    if not dept:
        raise NotFoundError("Departamento no encontrado")
    emp_count, team_count = _get_counts(dept.id, session) if is_admin else (None, None)
    return _to_response(dept, emp_count, team_count)


def create(
    payload: DepartmentCreate,
    tenant_id: uuid.UUID,
    session: Session,
) -> DepartmentResponse:
    _assert_unique_name(payload.name, tenant_id, session)

    dept = Department(
        tenant_id=tenant_id,
        name=payload.name,
        description=payload.description,
        color=payload.color,
        icon=payload.icon,
    )
    session.add(dept)
    session.commit()
    session.refresh(dept)

    security_logger.info(
        "department.created",
        extra={"department_id": str(dept.id), "name": dept.name, "tenant_id": str(tenant_id)},
    )
    emp_count, team_count = _get_counts(dept.id, session)
    return _to_response(dept, emp_count, team_count)


def update(
    department_id: uuid.UUID,
    payload: DepartmentUpdate,
    tenant_id: uuid.UUID,
    session: Session,
) -> DepartmentResponse:
    dept = session.exec(
        select(Department).where(
            Department.id == department_id,
            Department.tenant_id == tenant_id,
        )
    ).first()
    if not dept:
        raise NotFoundError("Departamento no encontrado")

    _assert_not_system(dept)

    update_data = payload.model_dump(exclude_unset=True)

    if "name" in update_data and update_data["name"] is not None:
        _assert_unique_name(update_data["name"], tenant_id, session, exclude_id=department_id)

    old_active = dept.is_active
    changed_fields: list[str] = []
    for key, value in update_data.items():
        if getattr(dept, key) != value:
            changed_fields.append(key)
            setattr(dept, key, value)

    dept.updated_at = datetime.now(UTC)
    session.add(dept)
    session.commit()
    session.refresh(dept)

    new_active = dept.is_active
    if "is_active" in update_data and old_active != new_active:
        action = "department.activated" if new_active else "department.deactivated"
    elif changed_fields:
        action = "department.updated"
    else:
        action = None

    if action:
        security_logger.info(
            action,
            extra={
                "department_id": str(dept.id),
                "changed_fields": changed_fields,
                "tenant_id": str(tenant_id),
            },
        )

    emp_count, team_count = _get_counts(dept.id, session)
    return _to_response(dept, emp_count, team_count)


def get_delete_preview(
    department_id: uuid.UUID,
    tenant_id: uuid.UUID,
    session: Session,
) -> DepartmentDeletePreview:
    dept = session.exec(
        select(Department).where(
            Department.id == department_id,
            Department.tenant_id == tenant_id,
        )
    ).first()
    if not dept:
        raise NotFoundError("Departamento no encontrado")

    _assert_not_system(dept)

    target = ensure_system_department(tenant_id, session)
    emp_count, team_count = _get_counts(dept.id, session)

    return DepartmentDeletePreview(
        department=_to_nested(dept),
        target_department=_to_nested(target),
        employees_to_reassign=emp_count,
        teams_to_reassign=team_count,
    )


def delete_with_reassign(
    department_id: uuid.UUID,
    tenant_id: uuid.UUID,
    session: Session,
) -> DepartmentDeleteResult:
    from app.models.employee import Employee
    from app.models.team import Team

    dept = session.exec(
        select(Department).where(
            Department.id == department_id,
            Department.tenant_id == tenant_id,
        )
    ).first()
    if not dept:
        raise NotFoundError("Departamento no encontrado")

    _assert_not_system(dept)

    target = ensure_system_department(tenant_id, session)

    # Reassign employees
    employees = session.exec(
        select(Employee).where(Employee.department_id == department_id)
    ).all()
    for emp in employees:
        emp.department_id = target.id
        session.add(emp)

    # Reassign teams
    teams = session.exec(
        select(Team).where(Team.department_id == department_id)
    ).all()
    for team in teams:
        team.department_id = target.id
        session.add(team)

    # Soft-delete department
    dept.is_active = False
    dept.updated_at = datetime.now(UTC)
    session.add(dept)

    session.commit()

    emp_count = len(employees)
    team_count = len(teams)

    security_logger.info(
        "department.deleted",
        extra={
            "department_id": str(department_id),
            "employees_reassigned": emp_count,
            "teams_reassigned": team_count,
            "target_department_id": str(target.id),
            "tenant_id": str(tenant_id),
        },
    )

    return DepartmentDeleteResult(
        id=department_id,
        employees_reassigned=emp_count,
        teams_reassigned=team_count,
        target_department=_to_nested(target),
    )
