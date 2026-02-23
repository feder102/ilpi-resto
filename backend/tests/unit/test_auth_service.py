"""T041b: Unit tests for AuthService."""

import pytest
from sqlmodel import Session

from app.common.exceptions import UnauthorizedError
from app.common.security import hash_password
from app.models.tenant import Tenant
from app.models.user import User
from app.services import auth_service


@pytest.fixture
def auth_tenant(session: Session):
    tenant = Tenant(name="Auth Test", slug="auth-test")
    session.add(tenant)
    session.commit()
    session.refresh(tenant)
    return tenant


@pytest.fixture
def auth_user(session: Session, auth_tenant):
    user = User(
        tenant_id=auth_tenant.id,
        email="test@ilpi.es",
        hashed_password=hash_password("TestPass123!"),
        role="Admin",
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


class TestLogin:
    def test_login_valid_credentials(self, session, auth_user):
        response, refresh_token = auth_service.login("test@ilpi.es", "TestPass123!", session)
        assert response.access_token
        assert response.user.email == "test@ilpi.es"
        assert response.user.role == "Admin"
        assert refresh_token

    def test_login_invalid_password(self, session, auth_user):
        with pytest.raises(UnauthorizedError):
            auth_service.login("test@ilpi.es", "WrongPassword!", session)

    def test_login_nonexistent_email(self, session, auth_user):
        with pytest.raises(UnauthorizedError):
            auth_service.login("nonexistent@ilpi.es", "TestPass123!", session)

    def test_login_inactive_user(self, session, auth_tenant):
        user = User(
            tenant_id=auth_tenant.id,
            email="inactive@ilpi.es",
            hashed_password=hash_password("TestPass123!"),
            role="Empleado",
            is_active=False,
        )
        session.add(user)
        session.commit()
        with pytest.raises(UnauthorizedError):
            auth_service.login("inactive@ilpi.es", "TestPass123!", session)


class TestRefresh:
    def test_refresh_valid_token(self, session, auth_user):
        _, refresh_token = auth_service.login("test@ilpi.es", "TestPass123!", session)
        response, new_refresh = auth_service.refresh(refresh_token, session)
        assert response.access_token
        assert response.user.email == "test@ilpi.es"

    def test_refresh_blacklisted_token(self, session, auth_user):
        _, refresh_token = auth_service.login("test@ilpi.es", "TestPass123!", session)
        auth_service.logout(refresh_token)
        with pytest.raises(UnauthorizedError):
            auth_service.refresh(refresh_token, session)

    def test_refresh_invalid_token(self, session):
        with pytest.raises(UnauthorizedError):
            auth_service.refresh("invalid-token", session)


class TestLogout:
    def test_logout_blacklists_token(self, session, auth_user):
        _, refresh_token = auth_service.login("test@ilpi.es", "TestPass123!", session)
        auth_service.logout(refresh_token)
        with pytest.raises(UnauthorizedError):
            auth_service.refresh(refresh_token, session)
