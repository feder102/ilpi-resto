"""Feature 015: Integration tests for the Admin-only metrics reports router.

Self-contained TestClient with a local SQLite engine (every table except
``department``, which has PostgreSQL-only DDL). Verifies HTTP wiring, response
shapes and RBAC (403 for non-Admin roles).
"""

import uuid
from datetime import date
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

import app.models  # noqa: F401  (register all tables)
from app.common.security import create_access_token
from app.dependencies import get_db
from app.main import app
from app.models.employee import Employee
from app.models.tenant import Tenant
from app.models.time_entry import TimeEntry, TimeEntrySource

BASE = "/api/v1/reports"


@pytest.fixture
def db_session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    tables = [t for t in SQLModel.metadata.sorted_tables if t.name != "department"]
    SQLModel.metadata.create_all(engine, tables=tables)
    with Session(engine) as s:
        yield s


@pytest.fixture
def client(db_session):
    def _override():
        yield db_session

    app.dependency_overrides[get_db] = _override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def tenant(db_session):
    t = Tenant(name="T", slug="t-metrics-api", timezone="Europe/Madrid", locale="es")
    db_session.add(t)
    db_session.commit()
    db_session.refresh(t)
    return t


def _headers(tenant_id, role):
    token = create_access_token(
        {"sub": str(uuid.uuid4()), "tenant_id": str(tenant_id), "role": role}
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def seeded_employee(db_session, tenant):
    emp = Employee(
        tenant_id=tenant.id,
        first_name="Ana",
        last_name="Ruiz",
        email="ana@test.es",
        dni="11111111A",
        role="Empleado",
        department_id=uuid.uuid4(),
        status="Activo",
        hire_date=date(2024, 1, 1),
    )
    db_session.add(emp)
    db_session.commit()
    db_session.refresh(emp)
    db_session.add(
        TimeEntry(
            tenant_id=tenant.id,
            employee_id=emp.id,
            shift_date=date.today(),
            hours_worked=Decimal("100.00"),
            source=TimeEntrySource.SHIFT,
        )
    )
    db_session.add(
        TimeEntry(
            tenant_id=tenant.id,
            employee_id=emp.id,
            shift_date=date.today(),
            hours_worked=Decimal("10.00"),
            source=TimeEntrySource.EXTRA,
        )
    )
    db_session.commit()
    return emp


ENDPOINTS = [
    "/overtime-ratio",
    "/overtime-ranking",
    "/absenteeism",
    "/vacation-liability",
]


class TestRBAC:
    @pytest.mark.parametrize("path", ENDPOINTS)
    @pytest.mark.parametrize("role", ["Moderador", "Empleado"])
    def test_non_admin_forbidden(self, client, tenant, path, role):
        resp = client.get(f"{BASE}{path}", headers=_headers(tenant.id, role))
        assert resp.status_code == 403, resp.text

    @pytest.mark.parametrize("path", ENDPOINTS)
    def test_unauthenticated_rejected(self, client, tenant, path):
        resp = client.get(f"{BASE}{path}")
        assert resp.status_code == 401


class TestOvertimeEndpoints:
    def test_overtime_ratio_shape(self, client, tenant, seeded_employee):
        resp = client.get(f"{BASE}/overtime-ratio", headers=_headers(tenant.id, "Admin"))
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["ordinary_hours"] == 100.0
        assert data["extra_hours"] == 10.0
        assert data["ratio_pct"] == 10.0

    def test_overtime_ranking_shape(self, client, tenant, seeded_employee):
        resp = client.get(f"{BASE}/overtime-ranking", headers=_headers(tenant.id, "Admin"))
        assert resp.status_code == 200, resp.text
        items = resp.json()["items"]
        assert items[0]["employee_name"] == "Ana Ruiz"
        assert items[0]["extra_hours"] == 10.0

    def test_ranking_limit_validation(self, client, tenant):
        resp = client.get(
            f"{BASE}/overtime-ranking?limit=0", headers=_headers(tenant.id, "Admin")
        )
        assert resp.status_code == 422

    def test_date_filter_applied(self, client, tenant, seeded_employee):
        # A past window with no data yields a null ratio
        resp = client.get(
            f"{BASE}/overtime-ratio?date_from=2020-01-01&date_to=2020-01-31",
            headers=_headers(tenant.id, "Admin"),
        )
        assert resp.status_code == 200
        assert resp.json()["ratio_pct"] is None


class TestAbsenteeismEndpoint:
    def test_absenteeism_shape(self, client, tenant):
        resp = client.get(f"{BASE}/absenteeism", headers=_headers(tenant.id, "Admin"))
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["planned_shifts"] == 0
        assert data["rate_pct"] == 0.0
        assert data["alert"] is False


class TestVacationLiabilityEndpoint:
    def test_liability_shape(self, client, tenant, seeded_employee):
        resp = client.get(
            f"{BASE}/vacation-liability", headers=_headers(tenant.id, "Admin")
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["year"] == date.today().year
        assert len(data["items"]) == 1
        assert data["items"][0]["employee_name"] == "Ana Ruiz"
