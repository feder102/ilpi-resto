"""T072b: Unit tests for ShiftService."""

import uuid
from datetime import date, timedelta

import pytest
from sqlmodel import Session, SQLModel, create_engine, select

from app.common.exceptions import ShiftConflictError, ValidationError
from app.models.employee import Employee
from app.models.shift_record import ShiftRecord
from app.models.shift_type import ShiftType
from app.models.tenant import Tenant
from app.models.vacation_request import VacationRequest
from app.schemas.shift import BulkShiftCreate
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


class TestList:
    def test_list_empty(self, session, tenant):
        result = shift_service.list_shifts(tenant.id, session)
        assert result["total"] == 0

    def test_list_with_records(self, session, tenant, employee):
        # Manual clock-in was removed; insert a ShiftRecord directly (roster assignment).
        session.add(
            ShiftRecord(
                tenant_id=tenant.id,
                employee_id=employee.id,
                date=date.today(),
            )
        )
        session.commit()
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


@pytest.fixture
def employee2(session, tenant):
    emp = Employee(
        tenant_id=tenant.id,
        first_name="Ana",
        last_name="López",
        email="ana@test.es",
        dni="44444444D",
        role="Empleado",
        department="Cocina",
        status="Activo",
        hire_date=date(2024, 2, 1),
    )
    session.add(emp)
    session.commit()
    session.refresh(emp)
    return emp


class TestCreateShiftsBulk:
    def _count_shifts(self, session, tenant, employee_id):
        return len(
            session.exec(
                select(ShiftRecord).where(
                    ShiftRecord.tenant_id == tenant.id,
                    ShiftRecord.employee_id == employee_id,
                )
            ).all()
        )

    def test_bulk_include_weekends(self, session, tenant, employee, employee2, shift_type):
        # Monday 2099-01-05 .. Sunday 2099-01-11 (7 days), both employees
        start = date(2099, 1, 5)
        end = date(2099, 1, 11)
        body = BulkShiftCreate(
            employee_ids=[employee.id, employee2.id],
            shift_type_id=shift_type.id,
            start_date=start,
            end_date=end,
            include_weekends=True,
        )
        result = shift_service.create_shifts_bulk(tenant.id, session, body, uuid.uuid4())
        # 7 days * 2 employees = 14 created
        assert result["created_count"] == 14
        assert result["skipped_count"] == 0
        assert self._count_shifts(session, tenant, employee.id) == 7

    def test_bulk_only_working_days(self, session, tenant, employee, shift_type):
        # Same week, but only Mon-Fri => 5 days
        start = date(2099, 1, 5)
        end = date(2099, 1, 11)
        body = BulkShiftCreate(
            employee_ids=[employee.id],
            shift_type_id=shift_type.id,
            start_date=start,
            end_date=end,
            include_weekends=False,
        )
        result = shift_service.create_shifts_bulk(tenant.id, session, body, uuid.uuid4())
        assert result["created_count"] == 5
        # Saturday (10) and Sunday (11) should not exist
        dates = {
            r.date
            for r in session.exec(
                select(ShiftRecord).where(ShiftRecord.employee_id == employee.id)
            ).all()
        }
        assert date(2099, 1, 10) not in dates
        assert date(2099, 1, 11) not in dates

    def test_bulk_skips_existing_shift(self, session, tenant, employee, shift_type):
        start = date(2099, 2, 2)
        end = date(2099, 2, 4)
        # Pre-create a shift on the middle day
        session.add(
            ShiftRecord(
                tenant_id=tenant.id,
                employee_id=employee.id,
                date=date(2099, 2, 3),
                shift_type_id=shift_type.id,
            )
        )
        session.commit()
        body = BulkShiftCreate(
            employee_ids=[employee.id],
            shift_type_id=shift_type.id,
            start_date=start,
            end_date=end,
            include_weekends=True,
        )
        result = shift_service.create_shifts_bulk(tenant.id, session, body, uuid.uuid4())
        assert result["created_count"] == 2
        assert result["skipped_count"] == 1
        assert result["skipped"][0]["reason"] == "Turno ya existente"

    def test_bulk_skips_vacation(self, session, tenant, employee, shift_type):
        start = date(2099, 3, 2)
        end = date(2099, 3, 4)
        session.add(
            VacationRequest(
                tenant_id=tenant.id,
                employee_id=employee.id,
                start_date=date(2099, 3, 3),
                end_date=date(2099, 3, 3),
                requested_days=1,
                status="Aprobado",
            )
        )
        session.commit()
        body = BulkShiftCreate(
            employee_ids=[employee.id],
            shift_type_id=shift_type.id,
            start_date=start,
            end_date=end,
            include_weekends=True,
        )
        result = shift_service.create_shifts_bulk(tenant.id, session, body, uuid.uuid4())
        assert result["created_count"] == 2
        assert result["skipped_count"] == 1
        assert result["skipped"][0]["reason"] == "Vacaciones aprobadas"

    def test_bulk_invalid_range_raises(self, session, tenant, employee, shift_type):
        body = BulkShiftCreate(
            employee_ids=[employee.id],
            shift_type_id=shift_type.id,
            start_date=date(2099, 5, 10),
            end_date=date(2099, 5, 1),
            include_weekends=True,
        )
        with pytest.raises(ValidationError, match="fecha de inicio"):
            shift_service.create_shifts_bulk(tenant.id, session, body, uuid.uuid4())

    def test_bulk_past_range_is_allowed(self, session, tenant, employee, shift_type):
        # Exceptional manual load: Admin/Moderador can register past shifts
        # (e.g., backfilling a forgotten day). No skip, no error.
        body = BulkShiftCreate(
            employee_ids=[employee.id],
            shift_type_id=shift_type.id,
            start_date=date(2000, 1, 3),  # Monday
            end_date=date(2000, 1, 5),    # Wednesday
            include_weekends=True,
        )
        result = shift_service.create_shifts_bulk(tenant.id, session, body, uuid.uuid4())
        assert result["created_count"] == 3
        assert result["skipped_count"] == 0

    def test_bulk_skips_unknown_employee(self, session, tenant, shift_type):
        unknown_id = uuid.uuid4()
        body = BulkShiftCreate(
            employee_ids=[unknown_id],
            shift_type_id=shift_type.id,
            start_date=date(2099, 6, 2),
            end_date=date(2099, 6, 4),
            include_weekends=True,
        )
        result = shift_service.create_shifts_bulk(tenant.id, session, body, uuid.uuid4())
        assert result["created_count"] == 0
        assert result["skipped_count"] == 1
        assert result["skipped"][0]["reason"] == "Empleado no encontrado o inactivo"

    def test_bulk_invalid_shift_type_raises(self, session, tenant, employee):
        body = BulkShiftCreate(
            employee_ids=[employee.id],
            shift_type_id=uuid.uuid4(),
            start_date=date(2099, 6, 2),
            end_date=date(2099, 6, 4),
            include_weekends=True,
        )
        with pytest.raises(ValidationError, match="Tipo de turno"):
            shift_service.create_shifts_bulk(tenant.id, session, body, uuid.uuid4())

    def test_bulk_range_too_large_raises(self, session, tenant, employee, shift_type):
        # 93-day span exceeds MAX_BULK_RANGE_DAYS (92) → rejected, nothing created
        start = date(2099, 1, 1)
        end = start + timedelta(days=shift_service.MAX_BULK_RANGE_DAYS)
        body = BulkShiftCreate(
            employee_ids=[employee.id],
            shift_type_id=shift_type.id,
            start_date=start,
            end_date=end,
            include_weekends=True,
        )
        with pytest.raises(ValidationError, match="rango no puede superar"):
            shift_service.create_shifts_bulk(tenant.id, session, body, uuid.uuid4())
        assert self._count_shifts(session, tenant, employee.id) == 0

    def test_bulk_range_at_limit_succeeds(self, session, tenant, employee, shift_type):
        # Exactly MAX_BULK_RANGE_DAYS days (inclusive) is allowed
        start = date(2099, 1, 1)
        end = start + timedelta(days=shift_service.MAX_BULK_RANGE_DAYS - 1)
        body = BulkShiftCreate(
            employee_ids=[employee.id],
            shift_type_id=shift_type.id,
            start_date=start,
            end_date=end,
            include_weekends=True,
        )
        result = shift_service.create_shifts_bulk(tenant.id, session, body, uuid.uuid4())
        assert result["created_count"] == shift_service.MAX_BULK_RANGE_DAYS
