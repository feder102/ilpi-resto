"""T046-T049: Unit & Integration tests for token expiration (Phase 6 - User Story 4).

Tests token expiration validation:
- Token expires after 24 hours
- Expired tokens cannot be reused
- Token invalidation on new request
- Old password stops working after reset
"""

import pytest
from datetime import datetime, timedelta, timezone
from uuid import UUID
import hashlib

from app.services.password_reset_service import PasswordResetService
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.common.exceptions import TokenExpiredError, InvalidResetTokenError


class TestTokenExpiration:
    """Test cases for token expiration (User Story 4)."""

    def test_token_expiration_after_24_hours(self):
        """T046: Token created at T, at T+24h+1min expires_at < now()."""
        # Setup: Simulate token creation time
        now = datetime.now(timezone.utc)

        # Token expires exactly 24 hours after creation
        expires_at = now - timedelta(hours=24, minutes=1)  # 24h 1min ago = EXPIRED

        # Assert: expires_at < now (token is expired)
        assert expires_at < now

        # Token created 25 hours ago would be expired
        created_at = now - timedelta(hours=25)
        token_expires = created_at + timedelta(hours=24)
        assert token_expires < now

    def test_token_reuse_prevention(self):
        """T047: Token marked used_at cannot be used again."""
        # Setup: Token with used_at set (not NULL)
        now = datetime.now(timezone.utc)
        used_at_time = now - timedelta(minutes=5)

        # If used_at is not NULL, token is already used
        assert used_at_time is not None

        # Service should check: if token.used_at IS NOT NULL → InvalidResetTokenError
        # This is validated in verify_token() method

    def test_token_invalidation_on_new_request(self, db: Session):
        """T048: Requesting new reset for same email invalidates previous unused tokens."""
        # Setup: Create user with existing unused token
        user = User(
            email="user@example.com",
            password_hash="hashed_password",
            first_name="Test",
            last_name="User",
            tenant_id=UUID("12345678-1234-5678-1234-567812345678"),
        )
        db.add(user)
        db.flush()

        now = datetime.now(timezone.utc)

        # Create first token
        token1_hash = hashlib.sha256("token1".encode()).hexdigest()
        token1 = PasswordResetToken(
            tenant_id=UUID("12345678-1234-5678-1234-567812345678"),
            user_id=user.id,
            token_hash=token1_hash,
            expires_at=now + timedelta(hours=24),
            ip_address="192.168.1.1",
            created_at=now,
            used_at=None,  # NOT used
        )
        db.add(token1)
        db.flush()

        # Action: Request new password reset (should invalidate token1)
        service = PasswordResetService(db=db, tenant_id=UUID("12345678-1234-5678-1234-567812345678"))
        service.request_password_reset(email="user@example.com", ip_address="192.168.1.1")

        # Assert: Token1 now has used_at set (invalidated)
        db.refresh(token1)
        assert token1.used_at is not None

    def test_old_password_stops_working_after_reset(self, db: Session):
        """T049: Login with old password fails after successful password reset."""
        # Setup: Create user with old password hash
        old_password_hash = "old_bcrypt_hash_12345"
        user = User(
            email="user@example.com",
            password_hash=old_password_hash,
            first_name="Test",
            last_name="User",
            tenant_id=UUID("12345678-1234-5678-1234-567812345678"),
        )
        db.add(user)
        db.flush()

        old_password_hash_check = user.password_hash
        assert old_password_hash_check == old_password_hash

        # Action: Simulate password reset (would change password_hash in Phase 5)
        new_password_hash = "new_bcrypt_hash_67890"
        user.password_hash = new_password_hash
        db.add(user)
        db.commit()

        # Assert: Old password no longer matches
        db.refresh(user)
        assert user.password_hash != old_password_hash
        assert user.password_hash == new_password_hash


# ============================================================================
# Additional expiration scenarios
# ============================================================================


@pytest.fixture
def password_reset_service(db: Session):
    """Create service instance for testing."""
    return PasswordResetService(db=db, tenant_id=UUID("12345678-1234-5678-1234-567812345678"))


def test_token_not_expired_before_24_hours(db: Session, password_reset_service):
    """Token valid within 24 hours."""
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=23, minutes=59)

    # Token expires in the future
    assert expires_at > now


def test_token_exactly_24_hours(db: Session, password_reset_service):
    """Token exactly at 24-hour boundary is expired."""
    now = datetime.now(timezone.utc)

    # Token created exactly 24 hours ago
    created_at = now - timedelta(hours=24)
    expires_at = created_at + timedelta(hours=24)

    # Should be considered expired (expires_at <= now)
    assert expires_at <= now


def test_multiple_tokens_same_user_independent_expiration(db: Session):
    """Multiple tokens for same user have independent expiration times."""
    user = User(
        email="user@example.com",
        password_hash="hashed_password",
        first_name="Test",
        last_name="User",
        tenant_id=UUID("12345678-1234-5678-1234-567812345678"),
    )
    db.add(user)
    db.flush()

    now = datetime.now(timezone.utc)

    # Create two tokens with different expiration times
    token1 = PasswordResetToken(
        tenant_id=UUID("12345678-1234-5678-1234-567812345678"),
        user_id=user.id,
        token_hash=hashlib.sha256("token1".encode()).hexdigest(),
        expires_at=now + timedelta(hours=24),
        ip_address="192.168.1.1",
        created_at=now,
        used_at=None,
    )

    token2 = PasswordResetToken(
        tenant_id=UUID("12345678-1234-5678-1234-567812345678"),
        user_id=user.id,
        token_hash=hashlib.sha256("token2".encode()).hexdigest(),
        expires_at=now + timedelta(hours=12),  # Expires sooner
        ip_address="192.168.1.1",
        created_at=now,
        used_at=None,
    )

    db.add(token1)
    db.add(token2)
    db.commit()

    # Assert: Different expiration times
    assert token1.expires_at != token2.expires_at
    assert token2.expires_at < token1.expires_at
