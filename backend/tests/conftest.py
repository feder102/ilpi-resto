"""T023b: Test infrastructure with SQLite in-memory database."""

import contextlib
import uuid

import pytest
from fastapi.testclient import TestClient
from passlib.context import CryptContext
from sqlmodel import Session, SQLModel, create_engine

from app.common.security import create_access_token
from app.dependencies import get_db
from app.main import app

# Use plaintext context for testing to avoid bcrypt compatibility issues
test_pwd_context = CryptContext(schemes=["plaintext"], deprecated="auto")


def test_hash_password(password: str) -> str:
    """Hash password for testing using plaintext."""
    return test_pwd_context.hash(password)

# SQLite in-memory for tests
TEST_DATABASE_URL = "sqlite:///./test.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})

# Patch app.database.engine so integration tests that import it directly use SQLite
import app.database as _db_module  # noqa: E402

_db_module.engine = test_engine


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Reset all slowapi rate limiter storages between tests to prevent cross-test interference."""
    import app.routers.auth as _auth_router
    import app.routers.password_reset_router as _pwd_router
    from app.main import limiter as _main_limiter

    def _reset_all() -> None:
        for lim in (_main_limiter, _auth_router.limiter, _pwd_router.limiter):
            with contextlib.suppress(Exception):
                lim.reset()

    _reset_all()
    yield
    _reset_all()


@pytest.fixture(name="session")
def session_fixture():
    SQLModel.metadata.create_all(test_engine)
    with Session(test_engine) as session:
        yield session
    SQLModel.metadata.drop_all(test_engine)


@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        yield session

    app.dependency_overrides[get_db] = get_session_override
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def test_tenant(session: Session):
    from app.models.tenant import Tenant

    tenant = Tenant(name="Test ILPI", slug="test-ilpi", timezone="Europe/Madrid", locale="es")
    session.add(tenant)
    session.commit()
    session.refresh(tenant)
    return tenant


@pytest.fixture
def test_employee(session: Session, test_tenant):
    from datetime import date

    from app.models.employee import Employee

    employee = Employee(
        tenant_id=test_tenant.id,
        first_name="Test",
        last_name="User",
        email="test@ilpi.es",
        dni="00000000T",
        role="Admin",
        department="Dirección",
        status="Activo",
        hire_date=date(2024, 1, 15),
    )
    session.add(employee)
    session.commit()
    session.refresh(employee)
    return employee


def create_test_user(session: Session, tenant_id: uuid.UUID, role: str, email: str, employee_id=None):
    from app.models.user import User

    user = User(
        tenant_id=tenant_id,
        email=email,
        hashed_password=test_hash_password("TestPass123!"),
        role=role,
        employee_id=employee_id,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def get_auth_headers(user_id: uuid.UUID, tenant_id: uuid.UUID, role: str) -> dict:
    token = create_access_token({
        "sub": str(user_id),
        "tenant_id": str(tenant_id),
        "role": role,
    })
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_user(session: Session, test_tenant, test_employee):
    return create_test_user(session, test_tenant.id, "Admin", "admin@test.es", test_employee.id)


@pytest.fixture
def admin_headers(admin_user, test_tenant):
    return get_auth_headers(admin_user.id, test_tenant.id, "Admin")


@pytest.fixture
def mod_user(session: Session, test_tenant):
    return create_test_user(session, test_tenant.id, "Moderador", "mod@test.es")


@pytest.fixture
def mod_headers(mod_user, test_tenant):
    return get_auth_headers(mod_user.id, test_tenant.id, "Moderador")


@pytest.fixture
def emp_user(session: Session, test_tenant):
    return create_test_user(session, test_tenant.id, "Empleado", "emp@test.es")


@pytest.fixture
def emp_headers(emp_user, test_tenant):
    return get_auth_headers(emp_user.id, test_tenant.id, "Empleado")
