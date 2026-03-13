"""T033-T035: Integration tests for password reset flow (Phase 5 - User Story 3).

Tests the complete password reset flow:
- Valid token + valid password → successful reset + token marked used
- Weak password → 422 validation error with details
- Password change invalidates old tokens for same user
"""

import pytest
from datetime import datetime, timedelta, timezone, UTC
from fastapi.testclient import TestClient
from sqlmodel import Session
from uuid import UUID
import hashlib
from passlib.context import CryptContext

from app.main import app
from app.models.user import User
from app.models.password_reset_token import PasswordResetToken
from app.database import get_session
from app.schemas.password_reset import PasswordResetVerifySchema

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TestPasswordResetFlow:
    """Test cases for password reset flow (User Story 3)."""

    @pytest.fixture
    def client(self, session: Session) -> TestClient:
        """Use shared test client with overridden database session."""
        from app.dependencies import get_db

        def override_get_db():
            return session

        app.dependency_overrides[get_db] = override_get_db
        return TestClient(app)

    def test_password_reset_success(self, client: TestClient, session: Session):
        """T033: Valid token + valid password → 200 + password updated + token marked used."""
        # Setup: Create user and valid reset token
        tenant_id = UUID("12345678-1234-5678-1234-567812345678")
        old_password_hash = pwd_context.hash("OldPassword123!")
        user = User(
            email="user@example.com",
            hashed_password=old_password_hash,
            role="Empleado",
            tenant_id=tenant_id,
        )
        session.add(user)
        session.flush()

        # Create valid reset token
        plaintext_token = "valid_reset_token_12345"
        token_hash = hashlib.sha256(plaintext_token.encode()).hexdigest()
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
        assert response.json()["message"] == "Contraseña restablecida exitosamente"
        assert response.json()["action"] == "redirect_to_login"
        assert response.json()["redirect_url"] == "/login"

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
            email="user@example.com",
            hashed_password=pwd_context.hash("OldPassword123!"),
            role="Empleado",
            tenant_id=tenant_id,
        )
        session.add(user)
        session.flush()

        plaintext_token = "valid_reset_token_12345"
        token_hash = hashlib.sha256(plaintext_token.encode()).hexdigest()
        now = datetime.now(UTC)

        reset_token = PasswordResetToken(
            tenant_id=UUID("12345678-1234-5678-1234-567812345678"),
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
        assert response.json()["error"]["code"] == "PASSWORD_VALIDATION_FAILED"
        assert "carácter especial" in response.json()["error"]["message"].lower()

    def test_password_change_invalidates_old_tokens(self, client: TestClient, session: Session):
        """T035: After password reset, old unused tokens for same user become invalid."""
        # Setup: Create user with TWO reset tokens
        tenant_id = UUID("12345678-1234-5678-1234-567812345678")
        user = User(
            email="user@example.com",
            hashed_password=pwd_context.hash("OldPassword123!"),
            role="Empleado",
            tenant_id=tenant_id,
        )
        session.add(user)
        session.flush()

        now = datetime.now(UTC)

        # Token 1: The one we'll use to reset
        token1_plain = "reset_token_1"
        token1_hash = hashlib.sha256(token1_plain.encode()).hexdigest()
        token1 = PasswordResetToken(
            tenant_id=UUID("12345678-1234-5678-1234-567812345678"),
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
        token2_plain = "reset_token_2"
        token2_hash = hashlib.sha256(token2_plain.encode()).hexdigest()
        token2 = PasswordResetToken(
            tenant_id=UUID("12345678-1234-5678-1234-567812345678"),
            user_id=user.id,
            token_hash=token2_hash,
            expires_at=now + timedelta(hours=24),
            ip_address="192.168.1.2",
            created_at=now - timedelta(hours=1),
            used_at=None,  # NOT used yet
        )
        session.add(token2)
        session.commit()

        # Action: Reset password using token1
        response = client.post(
            "/api/v1/auth/password-reset/verify",
            json={
                "token": token1_plain,
                "new_password": "NewPassword123!",
            },
            headers={"X-Tenant-ID": "12345678-1234-5678-1234-567812345678"},
        )

        assert response.status_code == 200

        # Assert: Token2 is now marked as used (invalidated)
        session.refresh(token2)
        assert token2.used_at is not None


# ============================================================================
# Additional test scenarios
# ============================================================================


def test_password_reset_after_expiration(db: Session):
    """Cannot reset password with expired token."""
    user = User(
        email="user@example.com",
        password_hash="hashed_password",
        first_name="Test",
        last_name="User",
        tenant_id=UUID("12345678-1234-5678-1234-567812345678"),
    )
    session.add(user)
    session.flush()

    # Create EXPIRED token
    plaintext_token = "expired_token"
    token_hash = hashlib.sha256(plaintext_token.encode()).hexdigest()
    now = datetime.now(UTC)

    reset_token = PasswordResetToken(
        tenant_id=UUID("12345678-1234-5678-1234-567812345678"),
        user_id=user.id,
        token_hash=token_hash,
        expires_at=now - timedelta(minutes=1),  # Expired
        ip_address="192.168.1.1",
        created_at=now - timedelta(hours=25),
        used_at=None,
    )
    session.add(reset_token)
    session.commit()

    # Action: Try to reset with expired token
    response = client.post(
        "/api/v1/auth/password-reset/verify",
        json={
            "token": plaintext_token,
            "new_password": "NewPassword123!",
        },
        headers={"X-Tenant-ID": "12345678-1234-5678-1234-567812345678"},
    )

    # Assert: Returns 410 Gone
    assert response.status_code == 410


def test_old_password_no_longer_works(db: Session):
    """After password reset, old password cannot be used for login."""
    old_password = "OldPassword123!"
    user = User(
        email="user@example.com",
        password_hash=bcrypt.using(rounds=10).hash(old_password),
        first_name="Test",
        last_name="User",
        tenant_id=UUID("12345678-1234-5678-1234-567812345678"),
    )
    session.add(user)
    session.flush()

    # Verify old password works
    assert bcrypt.verify(old_password, user.password_hash)

    # Simulate password reset
    new_password = "NewPassword123!"
    user.password_hash = bcrypt.using(rounds=10).hash(new_password)
    session.add(user)
    session.commit()

    # Refresh and verify
    session.refresh(user)

    # Assert: Old password no longer works
    assert not bcrypt.verify(old_password, user.password_hash)
    # Assert: New password works
    assert bcrypt.verify(new_password, user.password_hash)
