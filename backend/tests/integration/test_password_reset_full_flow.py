"""T033-T035: Integration tests for password reset flow (Phase 5 - User Story 3).

Tests the complete password reset flow:
- Valid token + valid password → successful reset + token marked used
- Weak password → 422 validation error with details
- Password change invalidates old tokens for same user
"""

from datetime import UTC, datetime, timedelta
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from passlib.context import CryptContext
from sqlmodel import Session

from app.dependencies import get_db
from app.main import app
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.services.password_reset_service import PasswordResetService

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TestPasswordResetFlow:
    """Test cases for password reset flow (User Story 3)."""

    @pytest.fixture
    def client(self, session: Session) -> TestClient:
        """Use shared test client with overridden database session."""
        def override_get_db():
            return session

        app.dependency_overrides[get_db] = override_get_db
        client = TestClient(app)
        yield client
        app.dependency_overrides.clear()

    def test_password_reset_success(self, client: TestClient, session: Session):
        """T033: Valid token + valid password → 200 + password updated + token marked used."""
        # Setup: Create user and valid reset token
        tenant_id = UUID("12345678-1234-5678-1234-567812345678")
        old_password_hash = pwd_context.hash("OldPassword123!")
        user = User(
            email="reset_test@example.com",
            hashed_password=old_password_hash,
            role="Empleado",
            tenant_id=tenant_id,
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        # Create valid reset token via service
        service = PasswordResetService(session, tenant_id)
        plaintext_token, token_hash = service._generate_reset_token()
        now = datetime.now(UTC)

        reset_token = PasswordResetToken(
            tenant_id=tenant_id,
            user_id=user.id,
            token_hash=token_hash,
            expires_at=now + timedelta(hours=24),
            ip_address="192.168.1.1",
            created_at=now,
            used_at=None,
        )
        session.add(reset_token)
        session.commit()

        # Action: Reset password
        new_password = "NewPassword123!"
        response = client.post(
            "/api/v1/auth/password-reset/verify",
            json={
                "token": plaintext_token,
                "new_password": new_password,
            },
            headers={"X-Tenant-ID": str(tenant_id)},
        )

        # Assert: Returns 200 with success message
        assert response.status_code == 200
        response_data = response.json()
        assert "message" in response_data
        assert "contraseña" in response_data.get("message", "").lower()

        # Assert: Password updated in database
        session.refresh(user)
        assert user.hashed_password != old_password_hash
        assert pwd_context.verify(new_password, user.hashed_password)

        # Assert: Token marked as used
        session.refresh(reset_token)
        assert reset_token.used_at is not None

    def test_password_reset_invalid_password(self, client: TestClient, session: Session):
        """T034: Weak password → 422 Unprocessable Entity with validation details."""
        # Setup: Create user and valid reset token
        tenant_id = UUID("12345678-1234-5678-1234-567812345678")
        user = User(
            email="weak_pass_test@example.com",
            hashed_password=pwd_context.hash("OldPassword123!"),
            role="Empleado",
            tenant_id=tenant_id,
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        # Create valid reset token
        service = PasswordResetService(session, tenant_id)
        plaintext_token, token_hash = service._generate_reset_token()
        now = datetime.now(UTC)

        reset_token = PasswordResetToken(
            tenant_id=tenant_id,
            user_id=user.id,
            token_hash=token_hash,
            expires_at=now + timedelta(hours=24),
            ip_address="192.168.1.1",
            created_at=now,
            used_at=None,
        )
        session.add(reset_token)
        session.commit()

        # Action: Try to reset with weak password (no special character)
        weak_password = "Password123"  # Missing special character
        response = client.post(
            "/api/v1/auth/password-reset/verify",
            json={
                "token": plaintext_token,
                "new_password": weak_password,
            },
            headers={"X-Tenant-ID": str(tenant_id)},
        )

        # Assert: Returns 422 with validation error
        assert response.status_code == 422

    def test_password_change_invalidates_old_tokens(self, client: TestClient, session: Session):
        """T035: After password reset, old unused tokens for same user become invalid."""
        # Setup: Create user with TWO reset tokens
        tenant_id = UUID("12345678-1234-5678-1234-567812345678")
        user = User(
            email="multi_token_test@example.com",
            hashed_password=pwd_context.hash("OldPassword123!"),
            role="Empleado",
            tenant_id=tenant_id,
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        now = datetime.now(UTC)
        service = PasswordResetService(session, tenant_id)

        # Token 1: The one we'll use to reset
        token1_plain, token1_hash = service._generate_reset_token()
        token1 = PasswordResetToken(
            tenant_id=tenant_id,
            user_id=user.id,
            token_hash=token1_hash,
            expires_at=now + timedelta(hours=24),
            ip_address="192.168.1.1",
            created_at=now,
            used_at=None,
        )
        session.add(token1)
        session.flush()

        # Token 2: Unused token that should be invalidated
        token2_plain, token2_hash = service._generate_reset_token()
        token2 = PasswordResetToken(
            tenant_id=tenant_id,
            user_id=user.id,
            token_hash=token2_hash,
            expires_at=now + timedelta(hours=24),
            ip_address="192.168.1.1",
            created_at=now,
            used_at=None,
        )
        session.add(token2)
        session.commit()

        # Action: Reset password using token1
        new_password = "NewPassword123!"
        response = client.post(
            "/api/v1/auth/password-reset/verify",
            json={
                "token": token1_plain,
                "new_password": new_password,
            },
            headers={"X-Tenant-ID": str(tenant_id)},
        )

        # Assert: Token1 reset succeeded
        assert response.status_code == 200

        # Assert: Token2 is now invalid (cannot be used again)
        response2 = client.post(
            "/api/v1/auth/password-reset/verify",
            json={
                "token": token2_plain,
                "new_password": "AnotherPass123!",
            },
            headers={"X-Tenant-ID": str(tenant_id)},
        )
        # Should fail because token was invalidated
        assert response2.status_code != 200
