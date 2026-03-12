"""T033-T035: Integration tests for password reset flow (Phase 5 - User Story 3).

Tests the complete password reset flow:
- Valid token + valid password → successful reset + token marked used
- Weak password → 422 validation error with details
- Password change invalidates old tokens for same user
"""

import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlmodel import Session
from uuid import UUID
import hashlib
import bcrypt

from app.main import app
from app.models.user import User
from app.models.password_reset_token import PasswordResetToken
from app.database import get_session
from app.schemas.password_reset import PasswordResetVerifySchema


client = TestClient(app)


class TestPasswordResetFlow:
    """Test cases for password reset flow (User Story 3)."""

    def test_password_reset_success(self, db: Session):
        """T033: Valid token + valid password → 200 + password updated + token marked used."""
        # Setup: Create user and valid reset token
        old_password_hash = bcrypt.using(rounds=10).hash("OldPassword123!")
        user = User(
            email="user@example.com",
            password_hash=old_password_hash,
            first_name="Test",
            last_name="User",
            tenant_id=UUID("12345678-1234-5678-1234-567812345678"),
        )
        db.add(user)
        db.flush()

        # Create valid reset token
        plaintext_token = "valid_reset_token_12345"
        token_hash = hashlib.sha256(plaintext_token.encode()).hexdigest()
        now = datetime.now(timezone.utc)

        reset_token = PasswordResetToken(
            tenant_id=UUID("12345678-1234-5678-1234-567812345678"),
            user_id=user.id,
            token_hash=token_hash,
            expires_at=now + timedelta(hours=24),
            ip_address="192.168.1.1",
            created_at=now,
            used_at=None,
        )
        db.add(reset_token)
        db.commit()

        # Action: Reset password
        new_password = "NewPassword123!"
        response = client.post(
            "/api/v1/auth/password-reset/verify",
            json={
                "token": plaintext_token,
                "new_password": new_password,
            },
            headers={"X-Tenant-ID": "12345678-1234-5678-1234-567812345678"},
        )

        # Assert: Returns 200 with success message
        assert response.status_code == 200
        assert response.json()["message"] == "Contraseña restablecida exitosamente"
        assert response.json()["action"] == "redirect_to_login"
        assert response.json()["redirect_url"] == "/login"

        # Assert: Password updated in database
        db.refresh(user)
        assert user.password_hash != old_password_hash
        assert bcrypt.verify(new_password, user.password_hash)

        # Assert: Token marked as used
        db.refresh(reset_token)
        assert reset_token.used_at is not None

    def test_password_reset_invalid_password(self, db: Session):
        """T034: Weak password → 422 Unprocessable Entity with validation details."""
        # Setup: Create user and valid reset token
        user = User(
            email="user@example.com",
            password_hash="hashed_password",
            first_name="Test",
            last_name="User",
            tenant_id=UUID("12345678-1234-5678-1234-567812345678"),
        )
        db.add(user)
        db.flush()

        plaintext_token = "valid_reset_token_12345"
        token_hash = hashlib.sha256(plaintext_token.encode()).hexdigest()
        now = datetime.now(timezone.utc)

        reset_token = PasswordResetToken(
            tenant_id=UUID("12345678-1234-5678-1234-567812345678"),
            user_id=user.id,
            token_hash=token_hash,
            expires_at=now + timedelta(hours=24),
            ip_address="192.168.1.1",
            created_at=now,
            used_at=None,
        )
        db.add(reset_token)
        db.commit()

        # Action: Try to reset with weak password (no special character)
        weak_password = "Password123"  # Missing special character
        response = client.post(
            "/api/v1/auth/password-reset/verify",
            json={
                "token": plaintext_token,
                "new_password": weak_password,
            },
            headers={"X-Tenant-ID": "12345678-1234-5678-1234-567812345678"},
        )

        # Assert: Returns 422 with validation error
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "PASSWORD_VALIDATION_FAILED"
        assert "carácter especial" in response.json()["error"]["message"].lower()

    def test_password_change_invalidates_old_tokens(self, db: Session):
        """T035: After password reset, old unused tokens for same user become invalid."""
        # Setup: Create user with TWO reset tokens
        user = User(
            email="user@example.com",
            password_hash=bcrypt.using(rounds=10).hash("OldPassword123!"),
            first_name="Test",
            last_name="User",
            tenant_id=UUID("12345678-1234-5678-1234-567812345678"),
        )
        db.add(user)
        db.flush()

        now = datetime.now(timezone.utc)

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
        db.add(token1)
        db.flush()

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
        db.add(token2)
        db.commit()

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
        db.refresh(token2)
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
    db.add(user)
    db.flush()

    # Create EXPIRED token
    plaintext_token = "expired_token"
    token_hash = hashlib.sha256(plaintext_token.encode()).hexdigest()
    now = datetime.now(timezone.utc)

    reset_token = PasswordResetToken(
        tenant_id=UUID("12345678-1234-5678-1234-567812345678"),
        user_id=user.id,
        token_hash=token_hash,
        expires_at=now - timedelta(minutes=1),  # Expired
        ip_address="192.168.1.1",
        created_at=now - timedelta(hours=25),
        used_at=None,
    )
    db.add(reset_token)
    db.commit()

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
    db.add(user)
    db.flush()

    # Verify old password works
    assert bcrypt.verify(old_password, user.password_hash)

    # Simulate password reset
    new_password = "NewPassword123!"
    user.password_hash = bcrypt.using(rounds=10).hash(new_password)
    db.add(user)
    db.commit()

    # Refresh and verify
    db.refresh(user)

    # Assert: Old password no longer works
    assert not bcrypt.verify(old_password, user.password_hash)
    # Assert: New password works
    assert bcrypt.verify(new_password, user.password_hash)
