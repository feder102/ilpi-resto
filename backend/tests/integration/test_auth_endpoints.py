"""T041c: Integration tests for auth endpoints."""

import pytest
from sqlmodel import Session

from app.common.security import hash_password
from app.models.tenant import Tenant
from app.models.user import User


@pytest.fixture
def auth_setup(session: Session):
    tenant = Tenant(name="Auth Test", slug="auth-ep-test")
    session.add(tenant)
    session.commit()
    session.refresh(tenant)

    user = User(
        tenant_id=tenant.id,
        email="admin@ilpi.es",
        hashed_password=hash_password("Admin123!"),
        role="Admin",
    )
    session.add(user)
    session.commit()
    return tenant, user


class TestLoginEndpoint:
    def test_login_success(self, client, auth_setup):
        response = client.post("/api/v1/auth/login", json={
            "email": "admin@ilpi.es",
            "password": "Admin123!",
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "admin@ilpi.es"
        assert data["user"]["role"] == "Admin"
        assert "refresh_token" in response.cookies

    def test_login_invalid_credentials(self, client, auth_setup):
        response = client.post("/api/v1/auth/login", json={
            "email": "admin@ilpi.es",
            "password": "WrongPass!",
        })
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "UNAUTHORIZED"

    def test_login_missing_fields(self, client, auth_setup):
        response = client.post("/api/v1/auth/login", json={
            "email": "admin@ilpi.es",
        })
        assert response.status_code == 422


class TestRefreshEndpoint:
    def test_refresh_success(self, client, auth_setup):
        # First login
        login_resp = client.post("/api/v1/auth/login", json={
            "email": "admin@ilpi.es",
            "password": "Admin123!",
        })
        assert login_resp.status_code == 200

        # Then refresh
        refresh_resp = client.post("/api/v1/auth/refresh")
        assert refresh_resp.status_code == 200
        assert "access_token" in refresh_resp.json()

    def test_refresh_no_cookie(self, client, auth_setup):
        # Clear cookies
        client.cookies.clear()
        response = client.post("/api/v1/auth/refresh")
        assert response.status_code == 401


class TestLogoutEndpoint:
    def test_logout_success(self, client, auth_setup):
        # Login first
        client.post("/api/v1/auth/login", json={
            "email": "admin@ilpi.es",
            "password": "Admin123!",
        })

        # Logout
        response = client.post("/api/v1/auth/logout")
        assert response.status_code == 204

        # Refresh should fail
        refresh_resp = client.post("/api/v1/auth/refresh")
        assert refresh_resp.status_code == 401
