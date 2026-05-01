"""T072b: Unit tests for ShiftService."""

import uuid
from datetime import date, timedelta

import pytest
from sqlmodel import Session, SQLModel, create_engine

from app.common.exceptions import NotFoundError, ShiftConflictError, ValidationError
from app.models.employee import Employee
from app.models.shift_type import ShiftType
from app.models.tenant import Tenant
from app.models.vacation_request import VacationRequest
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
        hire_date=date(2024, 1, 15),
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


@pytest.fixture
def shift_type(session, tenant):
    st = ShiftType(
        tenant_id=tenant.id,
        name="Mañana",
        type="MANANA",
        time_windows=[{"start": "08:00", "end": "14:00"}],
        expected_hours=6.0,
        is_active=True,
    )
    session.add(st)
    session.commit()
    session.refresh(st)
    return st


class TestCreateShift:
    def test_create_shift_success(self, session, tenant, employee, shift_type):
        shift_date = date.today() + timedelta(days=45)
        result = shift_service.create_shift(
            tenant_id=tenant.id,
            session=session,
            employee_id=employee.id,
            shift_date=shift_date,
            shift_type_id=shift_type.id,
            created_by=uuid.uuid4(),
        )
        assert result["shift"]["employee_id"] == str(employee.id)
        assert result["shift"]["date"] == shift_date.isoformat()
        assert result["shift"]["shift_type_name"] == "Mañana"

    def test_create_shift_vacation_conflict(self, session, tenant, employee, shift_type):
        """Test that shift creation fails when employee has approved vacation."""
        vacation_start = date.today() + timedelta(days=30)
        vacation_end = date.today() + timedelta(days=40)
        shift_date = date.today() + timedelta(days=35)

        # Create approved vacation
        vacation = VacationRequest(
            tenant_id=tenant.id,
            employee_id=employee.id,
            start_date=vacation_start,
            end_date=vacation_end,
            requested_days=11,
            status="Aprobado",
        )
        session.add(vacation)
        session.commit()

        # Try to create shift during vacation
        with pytest.raises(ShiftConflictError, match="vacaciones aprobadas"):
            shift_service.create_shift(
                tenant_id=tenant.id,
                session=session,
                employee_id=employee.id,
                shift_date=shift_date,
                shift_type_id=shift_type.id,
                created_by=uuid.uuid4(),
            )

    def test_create_shift_outside_vacation_allowed(self, session, tenant, employee, shift_type):
        """Test that shift creation succeeds when outside vacation period."""
        vacation_start = date.today() + timedelta(days=30)
        vacation_end = date.today() + timedelta(days=40)
        shift_date = date.today() + timedelta(days=45)

        # Create approved vacation
        vacation = VacationRequest(
            tenant_id=tenant.id,
            employee_id=employee.id,
            start_date=vacation_start,
            end_date=vacation_end,
            requested_days=11,
            status="Aprobado",
        )
        session.add(vacation)
        session.commit()

        # Create shift after vacation
        result = shift_service.create_shift(
            tenant_id=tenant.id,
            session=session,
            employee_id=employee.id,
            shift_date=shift_date,
            shift_type_id=shift_type.id,
            created_by=uuid.uuid4(),
        )
        assert result["shift"]["date"] == shift_date.isoformat()

    def test_create_shift_pending_vacation_allowed(self, session, tenant, employee, shift_type):
        """Test that shift creation succeeds with pending vacation (not approved)."""
        vacation_start = date.today() + timedelta(days=30)
        vacation_end = date.today() + timedelta(days=40)
        shift_date = date.today() + timedelta(days=35)

        # Create pending vacation (not approved)
        vacation = VacationRequest(
            tenant_id=tenant.id,
            employee_id=employee.id,
            start_date=vacation_start,
            end_date=vacation_end,
            requested_days=11,
            status="Pendiente",
        )
        session.add(vacation)
        session.commit()

        # Should allow shift during pending vacation
        result = shift_service.create_shift(
            tenant_id=tenant.id,
            session=session,
            employee_id=employee.id,
            shift_date=shift_date,
            shift_type_id=shift_type.id,
            created_by=uuid.uuid4(),
        )
        assert result["shift"]["date"] == shift_date.isoformat()
