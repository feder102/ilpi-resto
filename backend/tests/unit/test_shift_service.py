"""T072b: Unit tests for ShiftService."""

import pytest
from sqlmodel import Session, SQLModel, create_engine

from app.common.exceptions import NotFoundError, ValidationError
from app.models.employee import Employee
from app.models.tenant import Tenant
from app.services import shift_service

TEST_DB = "sqlite:///./test_shift_service.db"
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
def tenant(session):
    t = Tenant(name="Test", slug="test-shift", timezone="Europe/Madrid", locale="es")
    session.add(t)
    session.commit()
    session.refresh(t)
    return t


@pytest.fixture
def employee(session, tenant):
    emp = Employee(
        tenant_id=tenant.id,
        first_name="Luis",
        last_name="Martín",
        email="luis@test.es",
        dni="33333333C",
        role="Empleado",
        department="Barra",
        status="Activo",
        hire_date="2024-01-15",
    )
    session.add(emp)
    session.commit()
    session.refresh(emp)
    return emp


class TestClockIn:
    def test_clock_in(self, session, tenant, employee):
        result = shift_service.clock_in(employee.id, tenant.id, session)
        assert result.employee_id == employee.id
        assert result.exit_time is None
        assert result.employee_name == "Luis Martín"

    def test_clock_in_with_task(self, session, tenant, employee):
        result = shift_service.clock_in(
            employee.id, tenant.id, session, task_label="Parrilla"
        )
        assert result.task_label == "Parrilla"

    def test_duplicate_active_shift(self, session, tenant, employee):
        shift_service.clock_in(employee.id, tenant.id, session)
        with pytest.raises(ValidationError, match="turno activo"):
            shift_service.clock_in(employee.id, tenant.id, session)


class TestClockOut:
    def test_clock_out(self, session, tenant, employee):
        shift = shift_service.clock_in(employee.id, tenant.id, session)
        result = shift_service.clock_out(shift.id, tenant.id, session)
        assert result.exit_time is not None

    def test_clock_out_already_closed(self, session, tenant, employee):
        shift = shift_service.clock_in(employee.id, tenant.id, session)
        shift_service.clock_out(shift.id, tenant.id, session)
        with pytest.raises(ValidationError, match="cerrado"):
            shift_service.clock_out(shift.id, tenant.id, session)


class TestList:
    def test_list_empty(self, session, tenant):
        result = shift_service.list_shifts(tenant.id, session)
        assert result["total"] == 0

    def test_list_with_records(self, session, tenant, employee):
        shift_service.clock_in(employee.id, tenant.id, session)
        result = shift_service.list_shifts(tenant.id, session)
        assert result["total"] == 1
