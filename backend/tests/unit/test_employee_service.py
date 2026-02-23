"""T050b: Unit tests for EmployeeService."""

import uuid

import pytest
from sqlmodel import Session, SQLModel, create_engine

from app.common.exceptions import DuplicateError, ForbiddenError, NotFoundError
from app.models.employee import Employee
from app.models.tenant import Tenant
from app.models.vacation_request import VacationRequest
from app.services import employee_service

TEST_DB = "sqlite:///./test_emp_service.db"
engine = create_engine(TEST_DB, connect_args={"check_same_thread": False})


@pytest.fixture(autouse=True)
def setup_db():
    SQLModel.metadata.create_all(engine)
    yield
    SQLModel.metadata.drop_all(engine)


@pytest.fixture
def session():
    with Session(engine) as s:
        yield s


@pytest.fixture
def tenant(session: Session):
    t = Tenant(name="Test", slug="test", timezone="Europe/Madrid", locale="es")
    session.add(t)
    session.commit()
    session.refresh(t)
    return t


@pytest.fixture
def sample_employee_data():
    from app.schemas.employee import EmployeeCreate

    return EmployeeCreate(
        first_name="Juan",
        last_name="García",
        email="juan@test.es",
        dni="12345678A",
        role="Admin",
        department="Dirección",
        hire_date="2024-01-15",
    )


class TestCreate:
    def test_create_employee(self, session, tenant, sample_employee_data):
        result = employee_service.create(sample_employee_data, tenant.id, session)
        assert result.first_name == "Juan"
        assert result.last_name == "García"
        assert result.dni == "12345678A"

    def test_duplicate_dni_raises(self, session, tenant, sample_employee_data):
        employee_service.create(sample_employee_data, tenant.id, session)
        with pytest.raises(DuplicateError, match="DNI"):
            employee_service.create(sample_employee_data, tenant.id, session)

    def test_duplicate_email_raises(self, session, tenant, sample_employee_data):
        employee_service.create(sample_employee_data, tenant.id, session)
        from app.schemas.employee import EmployeeCreate

        data2 = EmployeeCreate(
            first_name="Otro",
            last_name="User",
            email="juan@test.es",
            dni="99999999B",
            role="Empleado",
            department="Cocina",
            hire_date="2024-06-01",
        )
        with pytest.raises(DuplicateError, match="email"):
            employee_service.create(data2, tenant.id, session)

    def test_tenant_isolation(self, session, tenant, sample_employee_data):
        employee_service.create(sample_employee_data, tenant.id, session)
        # Different tenant can use same DNI
        t2 = Tenant(name="Other", slug="other", timezone="Europe/Madrid", locale="es")
        session.add(t2)
        session.commit()
        session.refresh(t2)
        result = employee_service.create(sample_employee_data, t2.id, session)
        assert result.dni == "12345678A"


class TestList:
    def test_list_empty(self, session, tenant):
        result = employee_service.list_employees(tenant.id, session)
        assert result["items"] == []
        assert result["total"] == 0

    def test_list_with_search(self, session, tenant, sample_employee_data):
        employee_service.create(sample_employee_data, tenant.id, session)
        result = employee_service.list_employees(tenant.id, session, search="Juan")
        assert result["total"] == 1
        result = employee_service.list_employees(tenant.id, session, search="nonexist")
        assert result["total"] == 0

    def test_list_with_department_filter(self, session, tenant, sample_employee_data):
        employee_service.create(sample_employee_data, tenant.id, session)
        result = employee_service.list_employees(tenant.id, session, department="Dirección")
        assert result["total"] == 1
        result = employee_service.list_employees(tenant.id, session, department="Cocina")
        assert result["total"] == 0

    def test_pagination(self, session, tenant):
        from app.schemas.employee import EmployeeCreate

        for i in range(5):
            data = EmployeeCreate(
                first_name=f"Emp{i}",
                last_name="Test",
                email=f"emp{i}@test.es",
                dni=f"0000000{i}A",
                role="Empleado",
                department="Cocina",
                hire_date="2024-01-01",
            )
            employee_service.create(data, tenant.id, session)

        result = employee_service.list_employees(tenant.id, session, page=1, size=2)
        assert len(result["items"]) == 2
        assert result["total"] == 5
        assert result["pages"] == 3


class TestGetById:
    def test_get_existing(self, session, tenant, sample_employee_data):
        created = employee_service.create(sample_employee_data, tenant.id, session)
        result = employee_service.get_by_id(created.id, tenant.id, session)
        assert result.first_name == "Juan"

    def test_get_nonexistent_raises(self, session, tenant):
        with pytest.raises(NotFoundError):
            employee_service.get_by_id(uuid.uuid4(), tenant.id, session)


class TestUpdate:
    def test_update_fields(self, session, tenant, sample_employee_data):
        created = employee_service.create(sample_employee_data, tenant.id, session)
        from app.schemas.employee import EmployeeUpdate

        update = EmployeeUpdate(department="Cocina")
        result = employee_service.update(created.id, update, tenant.id, session)
        assert result.department == "Cocina"

    def test_update_duplicate_dni_raises(self, session, tenant, sample_employee_data):
        employee_service.create(sample_employee_data, tenant.id, session)
        from app.schemas.employee import EmployeeCreate, EmployeeUpdate

        data2 = EmployeeCreate(
            first_name="Otro",
            last_name="User",
            email="otro@test.es",
            dni="99999999B",
            role="Empleado",
            department="Cocina",
            hire_date="2024-06-01",
        )
        emp2 = employee_service.create(data2, tenant.id, session)
        with pytest.raises(DuplicateError, match="DNI"):
            employee_service.update(emp2.id, EmployeeUpdate(dni="12345678A"), tenant.id, session)


class TestSoftDelete:
    def test_admin_can_delete(self, session, tenant, sample_employee_data):
        created = employee_service.create(sample_employee_data, tenant.id, session)
        result = employee_service.soft_delete(created.id, tenant.id, "Admin", session)
        assert result["message"] == "Empleado desactivado"

    def test_non_admin_cannot_delete(self, session, tenant, sample_employee_data):
        created = employee_service.create(sample_employee_data, tenant.id, session)
        with pytest.raises(ForbiddenError):
            employee_service.soft_delete(created.id, tenant.id, "Moderador", session)

    def test_soft_delete_rejects_pending_vacations(self, session, tenant, sample_employee_data):
        created = employee_service.create(sample_employee_data, tenant.id, session)
        # Get the actual employee from DB to get UUID
        emp = session.get(Employee, created.id)
        # Create a pending vacation request
        vr = VacationRequest(
            tenant_id=tenant.id,
            employee_id=emp.id,
            start_date="2025-06-01",
            end_date="2025-06-10",
            requested_days=10,
            status="Pendiente",
        )
        session.add(vr)
        session.commit()

        result = employee_service.soft_delete(created.id, tenant.id, "Admin", session)
        assert result["rejected_requests"] == 1

        session.refresh(vr)
        assert vr.status == "Rechazado"
