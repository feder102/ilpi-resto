"""T058b: Unit tests for VacationService."""

import uuid
from datetime import date, timedelta

import pytest
from sqlmodel import Session, SQLModel, create_engine

from app.common.exceptions import (
    BalanceExceededError,
    ConflictError,
    ForbiddenError,
    ValidationError,
)
from app.models.employee import Employee
from app.models.tenant import Tenant
from app.services import vacation_service

TEST_DB = "sqlite:///./test_vacation_service.db"
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
    t = Tenant(name="Test", slug="test-vac", timezone="Europe/Madrid", locale="es")
    session.add(t)
    session.commit()
    session.refresh(t)
    return t


@pytest.fixture
def employee(session: Session, tenant):
    emp = Employee(
        tenant_id=tenant.id,
        first_name="Ana",
        last_name="Ruiz",
        email="ana@test.es",
        dni="11111111A",
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
def reviewer_id():
    return uuid.uuid4()


class TestCreateRequest:
    def test_create_valid(self, session, tenant, employee):
        today = date.today()
        start = today + timedelta(days=30)
        end = start + timedelta(days=9)
        result = vacation_service.create_request(employee.id, start, end, tenant.id, session)
        assert result.requested_days == 10
        assert result.status == "Pendiente"

    def test_insufficient_balance(self, session, tenant, employee):
        today = date.today()
        start = today + timedelta(days=30)
        end = start + timedelta(days=40)  # 41 days > 30 default
        with pytest.raises(BalanceExceededError, match="Saldo insuficiente"):
            vacation_service.create_request(employee.id, start, end, tenant.id, session)

    def test_invalid_dates(self, session, tenant, employee):
        today = date.today()
        with pytest.raises(ValidationError):
            vacation_service.create_request(
                employee.id, today + timedelta(days=10), today + timedelta(days=5), tenant.id, session
            )


class TestApprove:
    def test_approve_valid(self, session, tenant, employee, reviewer_id):
        today = date.today()
        start = today + timedelta(days=30)
        end = start + timedelta(days=4)
        req = vacation_service.create_request(employee.id, start, end, tenant.id, session)

        result = vacation_service.approve(req.id, req.version, reviewer_id, tenant.id, session)
        assert result.status == "Aprobado"
        assert result.version == req.version + 1

        balance = vacation_service.get_balance(employee.id, start.year, tenant.id, session)
        assert balance.used_days == 5

    def test_version_conflict(self, session, tenant, employee, reviewer_id):
        today = date.today()
        start = today + timedelta(days=30)
        end = start + timedelta(days=4)
        req = vacation_service.create_request(employee.id, start, end, tenant.id, session)

        with pytest.raises(ConflictError):
            vacation_service.approve(req.id, req.version + 999, reviewer_id, tenant.id, session)


class TestReject:
    def test_reject_pending(self, session, tenant, employee, reviewer_id):
        today = date.today()
        start = today + timedelta(days=30)
        end = start + timedelta(days=4)
        req = vacation_service.create_request(employee.id, start, end, tenant.id, session)

        result = vacation_service.reject(req.id, req.version, reviewer_id, tenant.id, session)
        assert result.status == "Rechazado"


class TestCancel:
    def test_cancel_own_pending(self, session, tenant, employee):
        today = date.today()
        start = today + timedelta(days=30)
        end = start + timedelta(days=4)
        req = vacation_service.create_request(employee.id, start, end, tenant.id, session)

        result = vacation_service.cancel(req.id, req.version, employee.id, tenant.id, session)
        assert result.status == "Cancelado"

    def test_cancel_other_forbidden(self, session, tenant, employee):
        today = date.today()
        start = today + timedelta(days=30)
        end = start + timedelta(days=4)
        req = vacation_service.create_request(employee.id, start, end, tenant.id, session)

        with pytest.raises(ForbiddenError):
            vacation_service.cancel(req.id, req.version, uuid.uuid4(), tenant.id, session)
