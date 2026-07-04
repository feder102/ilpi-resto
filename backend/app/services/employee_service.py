"""T015: Employee service — department string → FK (Feature 014)."""

import uuid
from datetime import UTC, datetime

from sqlmodel import Session, func, select

from app.common.exceptions import DuplicateError, ForbiddenError, NotFoundError, ValidationError
from app.models.department import Department
from app.models.employee import Employee
from app.models.user import User
from app.models.vacation_request import VacationRequest
from app.schemas.department import DepartmentNestedResponse
from app.schemas.employee import EmployeeCreate, EmployeeResponse, EmployeeUpdate
from app.services import audit_service

AUDIT_ENTITY_EMPLOYEE_VACATION = "employee_vacation_config"
AUDIT_ACTION_UPDATE_EMPLOYEE = "update_employee_vacation_days"


def _resolve_department(
    employee: Employee, session: Session
) -> DepartmentNestedResponse:
    dept = session.get(Department, employee.department_id)
    if dept is None:
        raise NotFoundError("Departamento del empleado no encontrado")
    return DepartmentNestedResponse(
        id=dept.id,
        name=dept.name,
        color=dept.color,
        icon=dept.icon,
        is_system=dept.is_system,
    )


def _to_response(emp: Employee, session: Session) -> EmployeeResponse:
    return EmployeeResponse(
        id=emp.id,
        first_name=emp.first_name,
        last_name=emp.last_name,
        email=emp.email,
        phone=emp.phone,
        dni=emp.dni,
        address=emp.address,
        birth_date=emp.birth_date,
        marital_status=emp.marital_status,
        gender=emp.gender,
        role=emp.role,
        department=_resolve_department(emp, session),
        status=emp.status,
        hire_date=emp.hire_date,
        profile_image=emp.profile_image,
        emergency_contact=emp.emergency_contact,
        is_active=emp.is_active,
        team_id=emp.team_id,
        custom_vacation_days=emp.custom_vacation_days,
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


def create(
    data: EmployeeCreate, tenant_id: uuid.UUID, session: Session
) -> EmployeeResponse:
    # Validate department
    _validate_department(data.department_id, tenant_id, session)

    # Check DNI uniqueness
    existing = session.exec(
        select(Employee).where(
            Employee.tenant_id == tenant_id,
            Employee.dni == data.dni,
        )
    ).first()
    if existing:
        raise DuplicateError("Ya existe un empleado con este DNI", "DUPLICATE_DNI")

    # Check email uniqueness in Employee table
    existing = session.exec(
        select(Employee).where(
            Employee.tenant_id == tenant_id,
            Employee.email == data.email,
        )
    ).first()
    if existing:
        raise DuplicateError("Ya existe un empleado con este email", "DUPLICATE_EMAIL")

    # Check email uniqueness in User table (for auth)
    existing_user = session.exec(
        select(User).where(
            User.tenant_id == tenant_id,
            User.email == data.email,
        )
    ).first()
    if existing_user:
        raise DuplicateError("Ya existe un usuario con este email", "DUPLICATE_EMAIL")

    # Create Employee
    employee = Employee(tenant_id=tenant_id, **data.model_dump())
    session.add(employee)
    session.flush()  # Get the ID without committing

    # Create corresponding User for authentication
    from passlib.context import CryptContext

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    temp_password = "TempPassword123!"  # Will be changed by user

    user = User(
        tenant_id=tenant_id,
        email=data.email,
        hashed_password=pwd_context.hash(temp_password),
        role="Empleado",
        is_active=False,  # Will be activated after password setup
        employee_id=employee.id,
    )
    session.add(user)
    session.commit()
    session.refresh(employee)

    return _to_response(employee, session)


def list_employees(
    tenant_id: uuid.UUID,
    session: Session,
    search: str | None = None,
    department_id: uuid.UUID | None = None,
    include_inactive: bool = False,
    page: int = 1,
    size: int = 20,
) -> dict:
    query = select(Employee).where(Employee.tenant_id == tenant_id)

    if not include_inactive:
        query = query.where(Employee.is_active == True)  # noqa: E712

    if search:
        pattern = f"%{search}%"
        query = query.where(
            (Employee.first_name.ilike(pattern))  # type: ignore[union-attr]
            | (Employee.last_name.ilike(pattern))  # type: ignore[union-attr]
            | (Employee.dni.ilike(pattern))  # type: ignore[union-attr]
        )

    if department_id is not None:
        query = query.where(Employee.department_id == department_id)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Paginate
    offset = (page - 1) * size
    employees = session.exec(query.offset(offset).limit(size)).all()

    pages = (total + size - 1) // size if total > 0 else 1

    return {
        "items": [_to_response(e, session) for e in employees],
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


def get_by_id(
    employee_id: uuid.UUID, tenant_id: uuid.UUID, session: Session
) -> EmployeeResponse:
    employee = session.exec(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.tenant_id == tenant_id,
        )
    ).first()
    if not employee:
        raise NotFoundError("Empleado no encontrado")
    return _to_response(employee, session)


def update(
    employee_id: uuid.UUID,
    data: EmployeeUpdate,
    tenant_id: uuid.UUID,
    session: Session,
    changed_by: uuid.UUID | None = None,
) -> EmployeeResponse:
    employee = session.exec(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.tenant_id == tenant_id,
        )
    ).first()
    if not employee:
        raise NotFoundError("Empleado no encontrado")

    update_data = data.model_dump(exclude_unset=True)

    # Validate department if changing
    if "department_id" in update_data:
        if update_data["department_id"] is None:
            raise ValidationError("El campo department_id no puede ser null")
        _validate_department(update_data["department_id"], tenant_id, session)

    # Check uniqueness if changing DNI or email
    if "dni" in update_data and update_data["dni"] != employee.dni:
        existing = session.exec(
            select(Employee).where(
                Employee.tenant_id == tenant_id,
                Employee.dni == update_data["dni"],
                Employee.id != employee_id,
            )
        ).first()
        if existing:
            raise DuplicateError("Ya existe un empleado con este DNI", "DUPLICATE_DNI")

    if "email" in update_data and update_data["email"] != employee.email:
        existing = session.exec(
            select(Employee).where(
                Employee.tenant_id == tenant_id,
                Employee.email == update_data["email"],
                Employee.id != employee_id,
            )
        ).first()
        if existing:
            raise DuplicateError("Ya existe un empleado con este email", "DUPLICATE_EMAIL")

    # Audit custom_vacation_days changes
    if "custom_vacation_days" in update_data and changed_by is not None:
        new_cvd = update_data["custom_vacation_days"]
        if new_cvd != employee.custom_vacation_days:
            audit_service.log(
                session=session,
                tenant_id=employee.tenant_id,
                entity_type=AUDIT_ENTITY_EMPLOYEE_VACATION,
                entity_id=str(employee.id),
                action=AUDIT_ACTION_UPDATE_EMPLOYEE,
                old_value=str(employee.custom_vacation_days),
                new_value=str(new_cvd),
                changed_by=changed_by,
            )

    for key, value in update_data.items():
        setattr(employee, key, value)
    employee.updated_at = datetime.now(UTC)

    # Sync role change to the associated User record (JWT reads from User.role)
    if "role" in update_data:
        linked_user = session.exec(
            select(User).where(User.employee_id == employee.id)
        ).first()
        if linked_user and linked_user.role != update_data["role"]:
            linked_user.role = update_data["role"]
            session.add(linked_user)

    session.add(employee)
    session.commit()
    session.refresh(employee)
    return _to_response(employee, session)


def soft_delete(
    employee_id: uuid.UUID,
    tenant_id: uuid.UUID,
    user_role: str,
    session: Session,
) -> dict:
    """Soft delete employee (mark as inactive) and disable associated user account."""
    if user_role != "Admin":
        raise ForbiddenError("Solo los administradores pueden eliminar empleados")

    employee = session.exec(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.tenant_id == tenant_id,
        )
    ).first()
    if not employee:
        raise NotFoundError("Empleado no encontrado")

    employee.is_active = False
    employee.status = "Inactivo"
    employee.updated_at = datetime.now(UTC)

    # Disable associated user account
    user = session.exec(
        select(User).where(
            User.employee_id == employee_id,
            User.tenant_id == tenant_id,
        )
    ).first()
    if user:
        user.is_active = False
        user.updated_at = datetime.now(UTC)
        session.add(user)

    # Auto-reject pending vacation requests
    pending = session.exec(
        select(VacationRequest).where(
            VacationRequest.employee_id == employee_id,
            VacationRequest.status == "Pendiente",
        )
    ).all()

    rejected_count = 0
    for req in pending:
        req.status = "Rechazado"
        req.updated_at = datetime.now(UTC)
        session.add(req)
        rejected_count += 1

    session.add(employee)
    session.commit()

    return {
        "message": "Empleado desactivado y usuario deshabilitado",
        "rejected_requests": rejected_count,
    }


def activate_employee(
    employee_id: uuid.UUID,
    tenant_id: uuid.UUID,
    user_role: str,
    session: Session,
) -> EmployeeResponse:
    """Reactivate inactive employee and enable associated user account."""
    if user_role != "Admin":
        raise ForbiddenError("Solo los administradores pueden reactivar empleados")

    employee = session.exec(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.tenant_id == tenant_id,
        )
    ).first()
    if not employee:
        raise NotFoundError("Empleado no encontrado")

    employee.is_active = True
    employee.status = "Activo"
    employee.updated_at = datetime.now(UTC)

    # Reactivate associated user account
    user = session.exec(
        select(User).where(
            User.employee_id == employee_id,
            User.tenant_id == tenant_id,
        )
    ).first()
    if user:
        user.is_active = True
        user.updated_at = datetime.now(UTC)
        session.add(user)

    session.add(employee)
    session.commit()
    session.refresh(employee)

    return _to_response(employee, session)
