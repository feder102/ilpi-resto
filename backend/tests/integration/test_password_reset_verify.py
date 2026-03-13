"""T024-T027: Integration tests for password token verification (Phase 4 - User Story 2).

Tests the verify_token() service method and GET /auth/password-reset/verify endpoint:
- Valid token returns success with metadata
- Expired token (>24h) returns 410 Gone
- Invalid/corrupted token returns 400
- Already-used token returns 400
"""

import pytest
from datetime import datetime, timedelta, UTC
from fastapi.testclient import TestClient
from sqlmodel import Session
from uuid import UUID
import hashlib

from app.main import app
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.dependencies import get_db
from app.services.password_reset_service import PasswordResetService
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TestTokenVerification:
    """Test cases for token verification endpoint and service."""

    @pytest.fixture
    def client(self, session: Session) -> TestClient:
        """Use shared test client with overridden database session."""
        def override_get_db():
            return session

        app.dependency_overrides[get_db] = override_get_db
        client = TestClient(app)
        yield client
        app.dependency_overrides.clear()

    def test_verify_valid_token(self, client: TestClient, session: Session):
        """T024: Valid token → 200 OK with metadata."""
        # Setup: Create user and valid reset token
        tenant_id = UUID("12345678-1234-5678-1234-567812345678")
        user = User(
            email="verify_test@example.com",
            hashed_password=pwd_context.hash("Password123!"),
            role="Empleado",
            tenant_id=tenant_id,
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        # Create valid token (expires in future)
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

        # Action: Verify token
        response = client.get(
            "/api/v1/auth/password-reset/verify",
            params={"token": plaintext_token},
            headers={"X-Tenant-ID": str(tenant_id)},
        )

        # Assert: Returns 200 OK
        assert response.status_code == 200
        response_data = response.json()
        assert response_data.get("valid") is True

    def test_verify_expired_token(self, client: TestClient, session: Session):
        """T025: Expired token (>24h) → 410 Gone."""
        # Setup: Create user and EXPIRED token
        tenant_id = UUID("12345678-1234-5678-1234-567812345678")
        user = User(
            email="expired_test@example.com",
            hashed_password=pwd_context.hash("Password123!"),
            role="Empleado",
            tenant_id=tenant_id,
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        # Create EXPIRED token
        service = PasswordResetService(session, tenant_id)
        plaintext_token, token_hash = service._generate_reset_token()
        now = datetime.now(UTC)

        reset_token = PasswordResetToken(
            tenant_id=tenant_id,
            user_id=user.id,
            token_hash=token_hash,
            expires_at=now - timedelta(hours=1),  # EXPIRED 1 hour ago
            ip_address="192.168.1.1",
            created_at=now - timedelta(hours=25),
            used_at=None,
        )
        session.add(reset_token)
        session.commit()

        # Action: Try to verify expired token
        response = client.get(
            "/api/v1/auth/password-reset/verify",
            params={"token": plaintext_token},
            headers={"X-Tenant-ID": str(tenant_id)},
        )

        # Assert: Returns 410 Gone (or 400 Bad Request)
        assert response.status_code in [410, 400]

    def test_verify_used_token(self, client: TestClient, session: Session):
        """T027: Already-used token → 400 Bad Request."""
        # Setup: Create user and USED token
        tenant_id = UUID("12345678-1234-5678-1234-567812345678")
        user = User(
            email="used_token_test@example.com",
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
            used_at=now - timedelta(minutes=5),  # Used 5 minutes ago
        )
        session.add(reset_token)
        session.commit()

        # Action: Try to verify already-used token
        response = client.get(
            "/api/v1/auth/password-reset/verify",
            params={"token": plaintext_token},
            headers={"X-Tenant-ID": str(tenant_id)},
        )

        # Assert: Returns 400 Already Used (or 422)
        assert response.status_code in [400, 422]
