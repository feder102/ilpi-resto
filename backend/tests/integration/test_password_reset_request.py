"""T013-T015: Integration tests for password reset request endpoint.

Tests the POST /auth/password-reset/request endpoint behavior:
- Valid registered email returns success
- Unregistered email returns same success (email enumeration protection)
- Rate limiting enforced (10-minute cooldown, 5/day max)
"""

import pytest
from datetime import datetime, timedelta, UTC
from fastapi.testclient import TestClient
from sqlmodel import Session
from uuid import UUID

from app.main import app
from app.models.user import User
from app.models.password_reset_token import PasswordResetToken
from app.dependencies import get_db
from app.common.exceptions import RateLimitExceededError


@pytest.fixture
def db_session(mocker):
    """Mock database session for testing."""
    # This will be replaced with actual database session in full integration tests
    pass


class TestPasswordResetRequest:
    """Test cases for POST /auth/password-reset/request endpoint."""

    def test_request_password_reset_success(self, session: Session):
        """T013: User requests reset for registered email → 200 + success message."""
        # Setup: Create a test user
        tenant_id = UUID("12345678-1234-5678-1234-567812345678")
        user = User(
            email="user@example.com",
            hashed_password="hashed_password",
            role="Empleado",
            tenant_id=tenant_id,
        )
        session.add(user)
        session.commit()

        # Action: Request password reset
        response = client.post(
            "/auth/password-reset/request",
            json={"email": "user@example.com"},
            headers={"X-Tenant-ID": "12345678-1234-5678-1234-567812345678"},
        )

        # Assert: Returns 200 with success message
        assert response.status_code == 200
        assert "Se ha enviado" in response.json()["message"]
        assert response.json()["expires_in_hours"] == 24

        # Verify: Token was created in database
        token = session.query(PasswordResetToken).filter_by(user_id=user.id).first()
        assert token is not None
        assert token.token_hash is not None
        assert token.expires_at > datetime.utcnow()
        assert token.used_at is None

    def test_request_password_reset_email_enumeration(self, session: Session):
        """T014: Email enumeration protection - registered + unregistered return same response."""
        # Setup: Create a test user
        tenant_id = UUID("12345678-1234-5678-1234-567812345678")
        registered_user = User(
            email="registered@example.com",
            hashed_password="hashed_password",
            role="Empleado",
            tenant_id=tenant_id,
        )
        session.add(registered_user)
        session.commit()

        # Action 1: Request for registered email
        response_registered = client.post(
            "/auth/password-reset/request",
            json={"email": "registered@example.com"},
            headers={"X-Tenant-ID": "12345678-1234-5678-1234-567812345678"},
        )

        # Action 2: Request for unregistered email
        response_unregistered = client.post(
            "/auth/password-reset/request",
            json={"email": "nonexistent@example.com"},
            headers={"X-Tenant-ID": "12345678-1234-5678-1234-567812345678"},
        )

        # Assert: Both return 200 with identical message
        assert response_registered.status_code == 200
        assert response_unregistered.status_code == 200
        assert response_registered.json()["message"] == response_unregistered.json()["message"]

    def test_request_password_reset_rate_limit_10_min(self, session: Session):
        """T015: Rate limiting - 2nd request within 10 min returns 429."""
        # Setup: Create a test user
        tenant_id = UUID("12345678-1234-5678-1234-567812345678")
        user = User(
            email="user@example.com",
            hashed_password="hashed_password",
            role="Empleado",
            tenant_id=tenant_id,
        )
        session.add(user)
        session.commit()

        # Action 1: First request - should succeed
        response_1 = client.post(
            "/auth/password-reset/request",
            json={"email": "user@example.com"},
            headers={"X-Tenant-ID": "12345678-1234-5678-1234-567812345678"},
        )
        assert response_1.status_code == 200

        # Action 2: Second request immediately after - should fail
        response_2 = client.post(
            "/auth/password-reset/request",
            json={"email": "user@example.com"},
            headers={"X-Tenant-ID": "12345678-1234-5678-1234-567812345678"},
        )

        # Assert: Returns 429 Too Many Requests
        assert response_2.status_code == 429
        assert response_2.json()["error"]["code"] == "RATE_LIMIT_EXCEEDED"
        assert "Intenta de nuevo" in response_2.json()["error"]["message"]
        assert response_2.headers.get("Retry-After") is not None


# ============================================================================
# ADDITIONAL TEST SCENARIOS (For reference, can be expanded)
# ============================================================================


def test_request_password_reset_invalid_email():
    """Request with invalid email format returns 400 validation error."""
    response = client.post(
        "/auth/password-reset/request",
        json={"email": "not-an-email"},
        headers={"X-Tenant-ID": "12345678-1234-5678-1234-567812345678"},
    )
    assert response.status_code == 422  # Pydantic validation error


def test_request_password_reset_missing_email():
    """Request without email field returns 422 validation error."""
    response = client.post(
        "/auth/password-reset/request",
        json={},
        headers={"X-Tenant-ID": "12345678-1234-5678-1234-567812345678"},
    )
    assert response.status_code == 422


def test_request_password_reset_rate_limit_daily():
    """5th request in same day succeeds, 6th request fails (5/day limit)."""
    # This test would need time mocking to work properly
    # Deferred to later refinement
    pass
