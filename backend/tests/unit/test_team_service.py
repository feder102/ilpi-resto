"""T072b: Unit tests for TeamService."""

from datetime import date

import pytest
from sqlmodel import Session, SQLModel, create_engine

from app.common.exceptions import DuplicateError, ValidationError
from app.models.employee import Employee
from app.models.tenant import Tenant
from app.models.vacation_request import VacationRequest
from app.services import team_service

TEST_DB = "sqlite:///./test_team_service.db"
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
    t = Tenant(name="Test", slug="test-team", timezone="Europe/Madrid", locale="es")
    session.add(t)
    session.commit()
    session.refresh(t)
    return t


@pytest.fixture
def employee(session, tenant):
    emp = Employee(
        tenant_id=tenant.id,
        first_name="Pedro",
        last_name="López",
        email="pedro@test.es",
        dni="22222222B",
        role="Empleado",
        department="Cocina",
        status="Activo",
        hire_date=date(2024, 1, 15),
    )
    session.add(emp)
    session.commit()
    session.refresh(emp)
    return emp


@pytest.fixture
def team_data(session, tenant):
    """Create team data with shift_type_id FK."""
    from app.models.shift_type import ShiftType
    from app.schemas.team import TeamCreate

    # Create a shift type for testing
    shift_type = ShiftType(
        tenant_id=tenant.id,
        name="Mañana Test",
        type="MAÑANA",
        time_windows=[{"start": "09:00", "end": "17:00"}],
        expected_hours=8.0,
        uses_dynamic_close=False,
    )
    session.add(shift_type)
    session.commit()
    session.refresh(shift_type)

    return TeamCreate(
        name="Equipo A",
        department="Cocina",
        shift_type_id=str(shift_type.id),
    )


class TestCreateTeam:
    def test_create(self, session, tenant, team_data):
        result = team_service.create(team_data, tenant.id, session)
        assert result.name == "Equipo A"
        assert result.department == "Cocina"

    def test_duplicate_raises(self, session, tenant, team_data):
        team_service.create(team_data, tenant.id, session)
        with pytest.raises(DuplicateError):
            team_service.create(team_data, tenant.id, session)


class TestMembers:
    def test_add_member(self, session, tenant, team_data, employee):
        team = team_service.create(team_data, tenant.id, session)
        result = team_service.add_member(team.id, employee.id, tenant.id, session)
        assert len(result.members) == 1
        assert result.members[0].first_name == "Pedro"

    def test_remove_member(self, session, tenant, team_data, employee):
        team = team_service.create(team_data, tenant.id, session)
        team_service.add_member(team.id, employee.id, tenant.id, session)
        result = team_service.remove_member(team.id, employee.id, tenant.id, session)
        assert len(result.members) == 0

    def test_add_on_vacation_raises(self, session, tenant, team_data, employee):
        from datetime import date, timedelta

        team = team_service.create(team_data, tenant.id, session)
        # Create approved vacation covering today
        today = date.today()
        vr = VacationRequest(
            tenant_id=tenant.id,
            employee_id=employee.id,
            start_date=today - timedelta(days=1),
            end_date=today + timedelta(days=5),
            requested_days=7,
            status="Aprobado",
        )
        session.add(vr)
        session.commit()

        with pytest.raises(ValidationError, match="vacaciones"):
            team_service.add_member(team.id, employee.id, tenant.id, session)
