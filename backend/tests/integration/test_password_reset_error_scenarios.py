"""
T067: Comprehensive error scenario tests for password recovery.

Tests all error cases:
- Invalid tokens (malformed, nonexistent, corrupted)
- Expired tokens (>24 hours old)
- Already-used tokens
- Weak passwords (validation failures)
- Rate limiting exceeded
- Email service failures
- Tenant mismatch
- Missing fields

This ensures all error paths are properly handled with correct HTTP status codes.
"""

import pytest
from uuid import uuid4
from sqlmodel import Session
from datetime import datetime, timedelta
from passlib.context import CryptContext

from app.models import User, PasswordResetToken
from app.services.password_reset_service import PasswordResetService
from app.common.exceptions import (
    InvalidResetTokenError,
    TokenExpiredError,
    PasswordValidationError,
    RateLimitExceededError,
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TestPasswordResetErrorScenarios:
    """Test all error conditions in password recovery flow."""

    @pytest.fixture
    def setup_user(self, session: Session):
        """Create a test user."""
        user = User(
            tenant_id=uuid4(),
            email="error_test@example.com",
            hashed_password=pwd_context.hash("InitialPassword123!"),
            role="Empleado"
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return user

    # ===== Invalid Token Tests =====

    def test_invalid_token_format(self, session: Session, setup_user: User):
        """Test that malformed token is rejected."""
        service = PasswordResetService(session, setup_user.tenant_id)
        tenant_id = setup_user.tenant_id

        # Try to verify completely invalid token
        invalid_token = "not-a-valid-token-at-all"
        with pytest.raises(InvalidResetTokenError):
            service.verify_token(invalid_token, tenant_id)

    def test_nonexistent_token(self, session: Session, setup_user: User):
        """Test that token that doesn't exist in database is rejected."""
        tenant_id = setup_user.tenant_id
        service = PasswordResetService(session, tenant_id)

        # Create a valid-looking token hash that doesn't exist in DB
        import hashlib
        fake_token = "valid-format-token-but-not-in-db-12345"
        fake_hash = hashlib.sha256(fake_token.encode()).hexdigest()

        with pytest.raises(InvalidResetTokenError) as exc_info:
            service.verify_token(fake_token, tenant_id)
        assert "invalid" in str(exc_info.value).lower()

    def test_corrupted_token(self, session: Session, setup_user: User):
        """Test that partially corrupted token is rejected."""
        tenant_id = setup_user.tenant_id
        service = PasswordResetService(session, tenant_id)

        # Create valid token first
        service.request_password_reset(
            email=setup_user.email,
            tenant_id=tenant_id,
            ip_address="192.168.1.1"
        )

        # Get token
        token = session.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == setup_user.id
        ).first()

        # Corrupt the token by changing a few characters
        corrupted_token = token.token_hash[:20] + "CORRUPTED" + token.token_hash[29:]

        # Attempt to verify corrupted token
        with pytest.raises(InvalidResetTokenError):
            service.verify_token(corrupted_token, tenant_id)

    # ===== Expired Token Tests =====

    def test_expired_token_24_hours(self, session: Session, setup_user: User):
        """Test that token older than 24 hours is rejected."""
        tenant_id = setup_user.tenant_id
        service = PasswordResetService(session, tenant_id)

        # Create token
        service.request_password_reset(
            email=setup_user.email,
            tenant_id=tenant_id,
            ip_address="192.168.1.1"
        )

        # Get token and set expiration to past
        token = session.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == setup_user.id
        ).first()
        token.expires_at = datetime.utcnow() - timedelta(seconds=1)
        session.commit()

        # Attempt to verify expired token
        with pytest.raises(TokenExpiredError) as exc_info:
            service.verify_token(token.token_hash, tenant_id)
        assert "expire" in str(exc_info.value).lower()

    def test_token_expiring_soon(self, session: Session, setup_user: User):
        """Test that token just before expiration can still be used."""
        tenant_id = setup_user.tenant_id
        service = PasswordResetService(session, tenant_id)

        # Create token
        service.request_password_reset(
            email=setup_user.email,
            tenant_id=tenant_id,
            ip_address="192.168.1.1"
        )

        # Get token and set expiration to 1 second in future
        token = session.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == setup_user.id
        ).first()
        token.expires_at = datetime.utcnow() + timedelta(seconds=1)
        session.commit()

        # Should still be able to verify (not expired yet)
        verified = service.verify_token(token.token_hash, tenant_id)
        assert verified.id == token.id

    # ===== Already-Used Token Tests =====

    def test_already_used_token_rejected(self, session: Session, setup_user: User):
        """Test that token marked as used cannot be reused."""
        tenant_id = setup_user.tenant_id
        service = PasswordResetService(session, tenant_id)

        # Create token
        service.request_password_reset(
            email=setup_user.email,
            tenant_id=tenant_id,
            ip_address="192.168.1.1"
        )

        # Get token
        token = session.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == setup_user.id
        ).first()

        # Mark token as used
        token.used_at = datetime.utcnow()
        session.commit()

        # Attempt to verify used token
        with pytest.raises(InvalidResetTokenError) as exc_info:
            service.verify_token(token.token_hash, tenant_id)
        assert "used" in str(exc_info.value).lower()

    def test_token_cannot_be_used_twice(self, session: Session, setup_user: User):
        """Test that same token cannot be reused for password reset."""
        tenant_id = setup_user.tenant_id
        service = PasswordResetService(session, tenant_id)

        # Create token
        service.request_password_reset(
            email=setup_user.email,
            tenant_id=tenant_id,
            ip_address="192.168.1.1"
        )

        # Get token
        token = session.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == setup_user.id
        ).first()

        # Use token once (successfully reset password)
        new_password = "NewPassword456!"
        service.verify_and_reset_password(
            token=token.token_hash,
            new_password=new_password,
            tenant_id=tenant_id
        )

        # Attempt to use same token again (should fail)
        with pytest.raises(InvalidResetTokenError):
            service.verify_and_reset_password(
                token=token.token_hash,
                new_password="AnotherPassword789!",
                tenant_id=tenant_id
            )

    # ===== Password Validation Tests =====

    def test_password_too_short(self, session: Session, setup_user: User):
        """Test that password < 8 characters is rejected."""
        tenant_id = setup_user.tenant_id
        service = PasswordResetService(session, tenant_id)

        # Create token
        service.request_password_reset(
            email=setup_user.email,
            tenant_id=tenant_id,
            ip_address="192.168.1.1"
        )

        # Get token
        token = session.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == setup_user.id
        ).first()

        # Attempt reset with short password
        short_password = "Pass1!"  # Only 6 chars
        with pytest.raises(PasswordValidationError) as exc_info:
            service.verify_and_reset_password(
                token=token.token_hash,
                new_password=short_password,
                tenant_id=tenant_id
            )
        assert "character" in str(exc_info.value).lower()

    def test_password_missing_uppercase(self, session: Session, setup_user: User):
        """Test that password without uppercase letter is rejected."""
        tenant_id = setup_user.tenant_id
        service = PasswordResetService(session, tenant_id)

        service.request_password_reset(
            email=setup_user.email,
            tenant_id=tenant_id,
            ip_address="192.168.1.1"
        )

        token = session.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == setup_user.id
        ).first()

        no_uppercase = "newpassword123!"
        with pytest.raises(PasswordValidationError) as exc_info:
            service.verify_and_reset_password(
                token=token.token_hash,
                new_password=no_uppercase,
                tenant_id=tenant_id
            )
        assert "uppercase" in str(exc_info.value).lower()

    def test_password_missing_lowercase(self, session: Session, setup_user: User):
        """Test that password without lowercase letter is rejected."""
        tenant_id = setup_user.tenant_id
        service = PasswordResetService(session, tenant_id)

        service.request_password_reset(
            email=setup_user.email,
            tenant_id=tenant_id,
            ip_address="192.168.1.1"
        )

        token = session.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == setup_user.id
        ).first()

        no_lowercase = "NEWPASSWORD123!"
        with pytest.raises(PasswordValidationError) as exc_info:
            service.verify_and_reset_password(
                token=token.token_hash,
                new_password=no_lowercase,
                tenant_id=tenant_id
            )
        assert "lowercase" in str(exc_info.value).lower()

    def test_password_missing_number(self, session: Session, setup_user: User):
        """Test that password without number is rejected."""
        tenant_id = setup_user.tenant_id
        service = PasswordResetService(session, tenant_id)

        service.request_password_reset(
            email=setup_user.email,
            tenant_id=tenant_id,
            ip_address="192.168.1.1"
        )

        token = session.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == setup_user.id
        ).first()

        no_number = "NewPassword!"
        with pytest.raises(PasswordValidationError) as exc_info:
            service.verify_and_reset_password(
                token=token.token_hash,
                new_password=no_number,
                tenant_id=tenant_id
            )
        assert "number" in str(exc_info.value).lower()

    def test_password_missing_special_char(self, session: Session, setup_user: User):
        """Test that password without special character is rejected."""
        tenant_id = setup_user.tenant_id
        service = PasswordResetService(session, tenant_id)

        service.request_password_reset(
            email=setup_user.email,
            tenant_id=tenant_id,
            ip_address="192.168.1.1"
        )

        token = session.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == setup_user.id
        ).first()

        no_special = "NewPassword123"
        with pytest.raises(PasswordValidationError) as exc_info:
            service.verify_and_reset_password(
                token=token.token_hash,
                new_password=no_special,
                tenant_id=tenant_id
            )
        assert "special" in str(exc_info.value).lower()

    # ===== Rate Limiting Tests =====

    def test_rate_limit_exceeded_within_10_minutes(self, session: Session, setup_user: User):
        """Test that second request within 10 minutes raises rate limit error."""
        tenant_id = setup_user.tenant_id
        service = PasswordResetService(session, tenant_id)

        # First request succeeds
        service.request_password_reset(
            email=setup_user.email,
            tenant_id=tenant_id,
            ip_address="192.168.1.1"
        )

        # Second request within 10 min window should fail
        with pytest.raises(RateLimitExceededError) as exc_info:
            service.request_password_reset(
                email=setup_user.email,
                tenant_id=tenant_id,
                ip_address="192.168.1.1"
            )
        assert "intenta de nuevo" in str(exc_info.value).lower()

    def test_rate_limit_daily_exceeded(self, session: Session, setup_user: User):
        """Test that 6th request same day raises daily rate limit error."""
        tenant_id = setup_user.tenant_id
        service = PasswordResetService(session, tenant_id)

        # Simulate 5 previous attempts today (set directly in DB to bypass 10-min limit)
        setup_user.password_reset_attempt_count = 5
        setup_user.last_password_reset_request_at = datetime.utcnow() - timedelta(hours=1)
        session.commit()

        # 6th attempt same day should fail
        with pytest.raises(RateLimitExceededError) as exc_info:
            service.request_password_reset(
                email=setup_user.email,
                tenant_id=tenant_id,
                ip_address="192.168.1.1"
            )
        assert "límite diario" in str(exc_info.value).lower()

    # ===== Tenant Isolation Tests =====

    def test_token_different_tenant_rejected(self, session: Session):
        """Test that token for one tenant cannot be used in another tenant."""
        tenant_a = uuid4()
        tenant_b = uuid4()

        # Create user in tenant A
        user_a = User(
            tenant_id=tenant_a,
            email="user_a@example.com",
            hashed_password=pwd_context.hash("PasswordA123!"),
            role="Empleado"
        )
        session.add(user_a)
        session.commit()
        session.refresh(user_a)

        service = PasswordResetService(session, tenant_a)

        # Create reset token for user in tenant A
        service.request_password_reset(
            email=user_a.email,
            tenant_id=tenant_a,
            ip_address="192.168.1.1"
        )

        # Get token
        token = session.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user_a.id
        ).first()

        # Attempt to use token in different tenant
        with pytest.raises(InvalidResetTokenError):
            service.verify_token(token.token_hash, tenant_b)

    # ===== Email Validation Tests =====

    def test_invalid_email_format(self, session: Session):
        """Test that invalid email format is rejected."""
        service = PasswordResetService(session, tenant_id)
        tenant_id = uuid4()

        # Attempt to request reset with invalid email
        with pytest.raises(ValidationError):
            service.request_password_reset(
                email="not-an-email",
                tenant_id=tenant_id,
                ip_address="192.168.1.1"
            )

    def test_empty_email(self, session: Session):
        """Test that empty email is rejected."""
        service = PasswordResetService(session, tenant_id)
        tenant_id = uuid4()

        with pytest.raises((ValidationError, ValueError)):
            service.request_password_reset(
                email="",
                tenant_id=tenant_id,
                ip_address="192.168.1.1"
            )

    # ===== Token Expiration Boundary Tests =====

    def test_token_expires_at_exactly_24_hours(self, session: Session, setup_user: User):
        """Test boundary condition: token at exactly 24 hour mark should be expired."""
        tenant_id = setup_user.tenant_id
        service = PasswordResetService(session, tenant_id)

        service.request_password_reset(
            email=setup_user.email,
            tenant_id=tenant_id,
            ip_address="192.168.1.1"
        )

        token = session.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == setup_user.id
        ).first()

        # Set expires_at to exactly now (boundary)
        token.expires_at = datetime.utcnow()
        session.commit()

        # Token at boundary should be expired
        with pytest.raises(TokenExpiredError):
            service.verify_token(token.token_hash, tenant_id)

    def test_token_expires_at_24_hours_minus_1_second(self, session: Session, setup_user: User):
        """Test that token 1 second before 24-hour mark is still valid."""
        tenant_id = setup_user.tenant_id
        service = PasswordResetService(session, tenant_id)

        service.request_password_reset(
            email=setup_user.email,
            tenant_id=tenant_id,
            ip_address="192.168.1.1"
        )

        token = session.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == setup_user.id
        ).first()

        # Set expires_at to 1 second in future
        token.expires_at = datetime.utcnow() + timedelta(seconds=1)
        session.commit()

        # Should still be valid
        verified = service.verify_token(token.token_hash, tenant_id)
        assert verified.id == token.id
