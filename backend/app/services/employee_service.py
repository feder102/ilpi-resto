"""T046: Employee service with CRUD operations."""

import uuid
from datetime import UTC, datetime

from sqlmodel import Session, func, select

from app.common.exceptions import DuplicateError, ForbiddenError, NotFoundError
from app.models.employee import Employee
from app.models.vacation_request import VacationRequest
from app.schemas.employee import EmployeeCreate, EmployeeResponse, EmployeeUpdate


def _to_response(emp: Employee) -> EmployeeResponse:
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
        department=emp.department,
        status=emp.status,
        hire_date=emp.hire_date,
        profile_image=emp.profile_image,
        emergency_contact=emp.emergency_contact,
        is_active=emp.is_active,
        team_id=emp.team_id,
    )


def create(
    data: EmployeeCreate, tenant_id: uuid.UUID, session: Session
) -> EmployeeResponse:
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
    from app.models.user import User
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
    # Use a temporary password that will be set via email/password-setup flow
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    temp_password = "TempPassword123!"  # Will be changed by user

    user = User(
        tenant_id=tenant_id,
        email=data.email,
        hashed_password=pwd_context.hash(temp_password),
        role="Empleado",  # Default role for new employees
        is_active=False,  # Will be activated after password setup
        employee_id=employee.id,  # Link to employee
    )
    session.add(user)
    session.commit()
    session.refresh(employee)

    return _to_response(employee)


def list_employees(
    tenant_id: uuid.UUID,
    session: Session,
    search: str | None = None,
    department: str | None = None,
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

    if department:
        query = query.where(Employee.department == department)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Paginate
    offset = (page - 1) * size
    employees = session.exec(query.offset(offset).limit(size)).all()

    pages = (total + size - 1) // size if total > 0 else 1

    return {
        "items": [_to_response(e) for e in employees],
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
    return _to_response(employee)


def update(
    employee_id: uuid.UUID,
    data: EmployeeUpdate,
    tenant_id: uuid.UUID,
    session: Session,
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

    for key, value in update_data.items():
        setattr(employee, key, value)
    employee.updated_at = datetime.now(UTC)

    session.add(employee)
    session.commit()
    session.refresh(employee)
    return _to_response(employee)


def soft_delete(
    employee_id: uuid.UUID,
    tenant_id: uuid.UUID,
    user_role: str,
    session: Session,
) -> dict:
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

    return {"message": "Empleado desactivado", "rejected_requests": rejected_count}
