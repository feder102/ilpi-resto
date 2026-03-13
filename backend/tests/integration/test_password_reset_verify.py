"""T024-T027: Integration tests for password token verification (Phase 4 - User Story 2).

Tests the verify_token() service method and GET /auth/password-reset/verify endpoint:
- Valid token returns success with metadata
- Expired token (>24h) returns 410 Gone
- Invalid/corrupted token returns 400
- Already-used token returns 400
"""

import pytest
from datetime import datetime, timedelta, timezone, UTC
from fastapi.testclient import TestClient
from sqlmodel import Session
from uuid import UUID
import hashlib

from app.main import app
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.dependencies import get_db
from app.common.exceptions import TokenExpiredError, InvalidResetTokenError


class TestTokenVerification:
    """Test cases for token verification endpoint and service."""

    def test_verify_valid_token(self, session: Session):
        """T024: Valid token → 200 OK with metadata."""
        # Setup: Create user and valid reset token
        tenant_id = UUID("12345678-1234-5678-1234-567812345678")
        user = User(
            email="user@example.com",
            hashed_password="hashed_password",
            role="Empleado",
            tenant_id=tenant_id,
        )
        session.add(user)
        session.flush()

        # Create valid token (expires in future)
        plaintext_token = "valid_test_token_12345"
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

        # Action: Verify token
        response = client.get(
            "/api/v1/auth/password-reset/verify",
            params={"token": plaintext_token},
            headers={"X-Tenant-ID": "12345678-1234-5678-1234-567812345678"},
        )

        # Assert: Returns 200 with token metadata
        assert response.status_code == 200
        assert response.json()["valid"] is True
        assert "expires_at" in response.json()

    def test_verify_expired_token(self, session: Session):
        """T025: Expired token (>24h) → 410 Gone."""
        # Setup: Create user and EXPIRED token
        tenant_id = UUID("12345678-1234-5678-1234-567812345678")
        user = User(
            email="user@example.com",
            hashed_password="hashed_password",
            role="Empleado",
            tenant_id=tenant_id,
        )
        session.add(user)
        session.flush()

        # Create expired token
        plaintext_token = "expired_token_12345"
        token_hash = hashlib.sha256(plaintext_token.encode()).hexdigest()
        now = datetime.now(UTC)

        reset_token = PasswordResetToken(
            tenant_id=UUID("12345678-1234-5678-1234-567812345678"),
            user_id=user.id,
            token_hash=token_hash,
            expires_at=now - timedelta(minutes=1),  # Expired 1 minute ago
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
            headers={"X-Tenant-ID": "12345678-1234-5678-1234-567812345678"},
        )

        # Assert: Returns 410 Gone (token expired)
        assert response.status_code == 410
        assert response.json()["error"]["code"] == "TOKEN_EXPIRED"
        assert "expirado" in response.json()["error"]["message"].lower()

    def test_verify_invalid_token(self, db: Session):
        """T026: Invalid/corrupted token → 400 Bad Request."""
        # Action: Verify with non-existent token
        response = client.get(
            "/api/v1/auth/password-reset/verify",
            params={"token": "invalid_token_does_not_exist"},
            headers={"X-Tenant-ID": "12345678-1234-5678-1234-567812345678"},
        )

        # Assert: Returns 400 Invalid Token
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "INVALID_RESET_TOKEN"

    def test_verify_used_token(self, session: Session):
        """T027: Already-used token → 400 Bad Request."""
        # Setup: Create user and USED token
        tenant_id = UUID("12345678-1234-5678-1234-567812345678")
        user = User(
            email="user@example.com",
            hashed_password="hashed_password",
            role="Empleado",
            tenant_id=tenant_id,
        )
        session.add(user)
        session.flush()

        # Create used token
        plaintext_token = "used_token_12345"
        token_hash = hashlib.sha256(plaintext_token.encode()).hexdigest()
        now = datetime.now(UTC)

        reset_token = PasswordResetToken(
            tenant_id=UUID("12345678-1234-5678-1234-567812345678"),
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
            headers={"X-Tenant-ID": "12345678-1234-5678-1234-567812345678"},
        )

        # Assert: Returns 400 Already Used
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "INVALID_RESET_TOKEN"
        assert "utilizado" in response.json()["error"]["message"].lower()


# ============================================================================
# Additional test scenarios
# ============================================================================


def test_verify_token_missing_parameter():
    """Missing token parameter returns 422 validation error."""
    response = client.get(
        "/api/v1/auth/password-reset/verify",
        headers={"X-Tenant-ID": "12345678-1234-5678-1234-567812345678"},
    )
    assert response.status_code == 422


def test_verify_token_tenant_isolation(session: Session):
    """Token from different tenant cannot be verified."""
    # Setup: Create token in tenant A
    tenant_a_id = UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    user = User(
        email="user@example.com",
        hashed_password="hashed_password",
        role="Empleado",
        tenant_id=tenant_a_id,  # Tenant A
    )
    session.add(user)
    session.flush()

    plaintext_token = "tenant_a_token"
    token_hash = hashlib.sha256(plaintext_token.encode()).hexdigest()
    now = datetime.now(UTC)

    reset_token = PasswordResetToken(
        tenant_id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),  # Tenant A
        user_id=user.id,
        token_hash=token_hash,
        expires_at=now + timedelta(hours=24),
        ip_address="192.168.1.1",
        created_at=now,
        used_at=None,
    )
    session.add(reset_token)
    session.commit()

    # Action: Try to verify token with Tenant B
    response = client.get(
        "/api/v1/auth/password-reset/verify",
        params={"token": plaintext_token},
        headers={"X-Tenant-ID": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"},  # Tenant B
    )

    # Assert: Returns 400 (token not found in this tenant)
    assert response.status_code == 400
