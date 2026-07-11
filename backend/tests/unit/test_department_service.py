"""Unit tests for DepartmentService — regression tests for issue #36."""

import pytest
from sqlmodel import Session, SQLModel, create_engine

from app.common.exceptions import ForbiddenError
from app.models.tenant import Tenant
from app.schemas.department import DepartmentCreate, DepartmentUpdate
from app.services import department_service

TEST_DB = "sqlite:///./test_department_service.db"
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
    t = Tenant(name="Test", slug="test-dept", timezone="Europe/Madrid", locale="es")
    session.add(t)
    session.commit()
    session.refresh(t)
    return t


@pytest.fixture
def system_dept(session, tenant):
    return department_service.ensure_system_department(tenant.id, session)


@pytest.fixture
def custom_dept(session, tenant):
    payload = DepartmentCreate(name="Cocina", color="#ff0000", icon="ChefHat")
    return department_service.create(payload, tenant.id, session)


class TestUpdateSystemDepartment:
    def test_update_color_icon_description_allowed(self, session, tenant, system_dept):
        payload = DepartmentUpdate(color="#123456", icon="ChefHat", description="Nueva desc")
        result = department_service.update(system_dept.id, payload, tenant.id, session)
        assert result.color == "#123456"
        assert result.icon == "ChefHat"
        assert result.description == "Nueva desc"

    def test_update_is_active_allowed(self, session, tenant, system_dept):
        payload = DepartmentUpdate(is_active=False)
        result = department_service.update(system_dept.id, payload, tenant.id, session)
        assert result.is_active is False

    def test_update_name_forbidden(self, session, tenant, system_dept):
        payload = DepartmentUpdate(name="Nuevo nombre")
        with pytest.raises(ForbiddenError):
            department_service.update(system_dept.id, payload, tenant.id, session)


class TestUpdateCustomDepartment:
    def test_update_name_allowed(self, session, tenant, custom_dept):
        payload = DepartmentUpdate(name="Cocina Central")
        result = department_service.update(custom_dept.id, payload, tenant.id, session)
        assert result.name == "Cocina Central"
