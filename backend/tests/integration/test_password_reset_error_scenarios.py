"""Test error scenarios for password recovery.

Tests error cases:
- Invalid tokens (malformed, expired, already-used)
- Weak passwords (validation failures)
- Tenant mismatch
"""

import pytest
from datetime import datetime, timedelta, UTC
from fastapi.testclient import TestClient
from sqlmodel import Session
from uuid import UUID
import hashlib

from app.main import app
from app.models.user import User
from app.models.password_reset_token import PasswordResetToken
from app.dependencies import get_db
from app.services.password_reset_service import PasswordResetService
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TestPasswordResetErrorScenarios:
    """Test error conditions in password recovery flow."""

    @pytest.fixture
    def client(self, session: Session) -> TestClient:
        """Use shared test client with overridden database session."""
        def override_get_db():
            return session

        app.dependency_overrides[get_db] = override_get_db
        client = TestClient(app)
        yield client
        app.dependency_overrides.clear()

    def test_invalid_token_format(self, client: TestClient, session: Session):
        """Test that malformed token is rejected."""
        tenant_id = UUID("12345678-1234-5678-1234-567812345678")

        # Try to verify completely invalid token
        response = client.get(
            "/api/v1/auth/password-reset/verify",
            params={"token": "not-a-valid-token-at-all"},
            headers={"X-Tenant-ID": str(tenant_id)},
        )

        # Should reject invalid token
        assert response.status_code != 200

    def test_nonexistent_token(self, client: TestClient, session: Session):
        """Test that non-existent token is rejected."""
        tenant_id = UUID("12345678-1234-5678-1234-567812345678")

        # Create a valid-looking token hash that doesn't exist in DB
        import hashlib
        fake_token = "valid-format-token-but-not-in-db-12345"

        response = client.get(
            "/api/v1/auth/password-reset/verify",
            params={"token": fake_token},
            headers={"X-Tenant-ID": str(tenant_id)},
        )

        # Should reject non-existent token
        assert response.status_code != 200

    def test_expired_token(self, client: TestClient, session: Session):
        """Test that expired token is rejected."""
        tenant_id = UUID("12345678-1234-5678-1234-567812345678")

        # Create user
        user = User(
            email="expired@example.com",
            hashed_password=pwd_context.hash("Password123!"),
            role="Empleado",
            tenant_id=tenant_id,
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        # Create expired token
        service = PasswordResetService(session, tenant_id)
        plaintext_token, token_hash = service._generate_reset_token()
        now = datetime.now(UTC)

        reset_token = PasswordResetToken(
            tenant_id=tenant_id,
            user_id=user.id,
            token_hash=token_hash,
            expires_at=now - timedelta(hours=1),  # EXPIRED
            ip_address="192.168.1.1",
            created_at=now - timedelta(hours=25),
            used_at=None,
        )
        session.add(reset_token)
        session.commit()

        # Try to verify expired token
        response = client.get(
            "/api/v1/auth/password-reset/verify",
            params={"token": plaintext_token},
            headers={"X-Tenant-ID": str(tenant_id)},
        )

        # Should reject expired token
        assert response.status_code != 200

    def test_already_used_token(self, client: TestClient, session: Session):
        """Test that already-used token is rejected."""
        tenant_id = UUID("12345678-1234-5678-1234-567812345678")

        # Create user
        user = User(
            email="used@example.com",
            hashed_password=pwd_context.hash("Password123!"),
            role="Empleado",
            tenant_id=tenant_id,
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        # Create used token
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
            used_at=now - timedelta(minutes=5),  # USED 5 min ago
        )
        session.add(reset_token)
        session.commit()

        # Try to verify already-used token
        response = client.get(
            "/api/v1/auth/password-reset/verify",
            params={"token": plaintext_token},
            headers={"X-Tenant-ID": str(tenant_id)},
        )

        # Should reject used token
        assert response.status_code != 200

    def test_password_too_short(self, client: TestClient, session: Session):
        """Test that password < 8 chars is rejected."""
        tenant_id = UUID("12345678-1234-5678-1234-567812345678")

        # Create user
        user = User(
            email="short_pass@example.com",
            hashed_password=pwd_context.hash("Password123!"),
            role="Empleado",
            tenant_id=tenant_id,
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        # Create valid token
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

        # Try to reset with short password
        response = client.post(
            "/api/v1/auth/password-reset/verify",
            json={
                "token": plaintext_token,
                "new_password": "Short1!",  # Only 7 chars
            },
            headers={"X-Tenant-ID": str(tenant_id)},
        )

        # Should reject short password
        assert response.status_code == 422

    def test_password_missing_special_char(self, client: TestClient, session: Session):
        """Test that password without special char is rejected."""
        tenant_id = UUID("12345678-1234-5678-1234-567812345678")

        # Create user
        user = User(
            email="no_special@example.com",
            hashed_password=pwd_context.hash("Password123!"),
            role="Empleado",
            tenant_id=tenant_id,
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        # Create valid token
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

        # Try to reset without special character
        response = client.post(
            "/api/v1/auth/password-reset/verify",
            json={
                "token": plaintext_token,
                "new_password": "Password123",  # No special char
            },
            headers={"X-Tenant-ID": str(tenant_id)},
        )

        # Should reject password without special char
        assert response.status_code == 422
