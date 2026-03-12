"""Password Reset Service - Business Logic for Password Recovery.

This service handles all password reset operations including:
- Token generation and validation
- Password validation
- Email sending
- Rate limiting
- Audit logging
"""

import hashlib
import logging
import os
import re
from datetime import UTC, datetime, timedelta
from secrets import token_urlsafe
from uuid import UUID
from concurrent.futures import ThreadPoolExecutor

from sqlmodel import Session, select

from app.common.exceptions import (
    InvalidResetTokenError,
    PasswordValidationError,
    RateLimitExceededError,
    TokenExpiredError,
)
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User

logger = logging.getLogger(__name__)


class PasswordResetService:
    """Service for password reset operations."""

    # Configuration
    TOKEN_EXPIRATION_HOURS = 24
    RATE_LIMIT_MINUTES = 10
    RATE_LIMIT_DAILY_MAX = 5
    PASSWORD_MIN_LENGTH = 8

    def __init__(self, db: Session, tenant_id: UUID):
        """Initialize password reset service.

        Args:
            db: Database session
            tenant_id: Tenant ID for multi-tenancy
        """
        self.db = db
        self.tenant_id = tenant_id

    def request_password_reset(self, email: str, ip_address: str) -> None:
        """Request a password reset token.

        Args:
            email: User's email address
            ip_address: IP address making the request (for audit logging)

        Raises:
            RateLimitExceededError: If rate limit exceeded
        """
        # Step 1: Validate email format (basic check)
        if not re.match(r"^[\w\.-]+@[\w\.-]+\.\w+$", email):
            logger.warning(f"Invalid email format attempted: {email}")
            # Email enumeration protection: Return same response for invalid emails
            # Don't raise exception, proceed as if email exists

        # Step 2: Check rate limiting (before any other operation)
        self._check_rate_limit(email)

        # Step 3: Look up user (if exists) for future use
        user = self.db.execute(
            select(User).where(
                User.email == email,
                User.tenant_id == self.tenant_id,
            )
        ).scalars().first()

        # Step 4: Generate token and hash
        plaintext_token, token_hash = self._generate_reset_token()

        # Step 5: Create PasswordResetToken in database
        now = datetime.now(UTC)
        expires_at = now + timedelta(hours=self.TOKEN_EXPIRATION_HOURS)

        reset_token = PasswordResetToken(
            tenant_id=self.tenant_id,
            user_id=user.id if user else None,
            token_hash=token_hash,
            expires_at=expires_at,
            ip_address=ip_address,
            created_at=now,
        )
        self.db.add(reset_token)
        self.db.flush()

        # Step 6: Update User fields (if user exists)
        if user:
            user.last_password_reset_request_at = now
            user.password_reset_attempt_count = (user.password_reset_attempt_count or 0) + 1
            self.db.add(user)

        # Step 7: Send email asynchronously
        reset_link = f"{os.getenv('APP_URL', 'https://app.local')}/password-reset?token={plaintext_token}"
        self._send_reset_email(email, reset_link)

        # Step 8: Commit database changes
        self.db.commit()

        # Step 9: Log event
        logger.info(
            f"Password reset requested",
            extra={
                "user_id": user.id if user else None,
                "email": email,
                "ip_address": ip_address,
                "tenant_id": str(self.tenant_id),
            },
        )

    def verify_token(self, token: str) -> PasswordResetToken:
        """Verify reset token and return token record.

        Args:
            token: Plaintext reset token from email link

        Returns:
            PasswordResetToken: Token record from database

        Raises:
            InvalidResetTokenError: If token invalid or already used
            TokenExpiredError: If token has expired
        """
        # TODO: Implement in Phase 4 (User Story 2)
        # - Hash plaintext token with SHA256
        # - Query DB for token
        # - Check expiration (expires_at > now)
        # - Check not already used (used_at IS NULL)
        # - Check tenant isolation
        # - Return token record
        raise NotImplementedError("Implement in Phase 4 - User Story 2")

    def verify_and_reset_password(
        self, token: str, new_password: str, user_id: UUID | None = None
    ) -> User:
        """Verify token and reset user password.

        Args:
            token: Plaintext reset token
            new_password: New password (will be validated and hashed)
            user_id: Optional user ID (if known)

        Returns:
            User: Updated user object

        Raises:
            InvalidResetTokenError: If token invalid
            TokenExpiredError: If token expired
            PasswordValidationError: If password doesn't meet requirements
        """
        # TODO: Implement in Phase 5 (User Story 3)
        # - Call verify_token(token) to validate token
        # - Call _validate_password(new_password)
        # - Get User from token
        # - Hash password with bcrypt (cost >= 10)
        # - Update User.hashed_password
        # - Mark token as used (used_at = now)
        # - Invalidate other unused tokens for this user
        # - Log event to AuditLog
        # - Return updated user
        raise NotImplementedError("Implement in Phase 5 - User Story 3")

    def _validate_password(self, password: str) -> None:
        """Validate password meets security requirements.

        Password must have:
        - Minimum 8 characters
        - At least 1 uppercase letter
        - At least 1 lowercase letter
        - At least 1 digit
        - At least 1 special character

        Args:
            password: Password to validate

        Raises:
            PasswordValidationError: If password doesn't meet requirements
        """
        # TODO: Implement in Phase 5 (User Story 3)
        errors = []

        if len(password) < self.PASSWORD_MIN_LENGTH:
            errors.append(f"Mínimo {self.PASSWORD_MIN_LENGTH} caracteres")

        if not re.search(r"[A-Z]", password):
            errors.append("Al menos una mayúscula (A-Z)")

        if not re.search(r"[a-z]", password):
            errors.append("Al menos una minúscula (a-z)")

        if not re.search(r"[0-9]", password):
            errors.append("Al menos un número (0-9)")

        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            errors.append("Al menos un carácter especial (!@#$%...)")

        if errors:
            raise PasswordValidationError(
                message=f"La contraseña no cumple con los requisitos: {', '.join(errors)}"
            )

    def _generate_reset_token(self) -> tuple[str, str]:
        """Generate a new reset token.

        Returns:
            Tuple of (plaintext_token, token_hash)
            - plaintext_token: Sent in email link
            - token_hash: Stored in database (never plaintext)
        """
        plaintext_token = token_urlsafe(32)  # 256-bit entropy
        token_hash = hashlib.sha256(plaintext_token.encode()).hexdigest()
        return plaintext_token, token_hash

    def _check_rate_limit(self, email: str) -> None:
        """Check rate limiting for password reset requests.

        Enforces:
        - Maximum 1 request per 10 minutes per email
        - Maximum 5 requests per day per email

        Args:
            email: User's email address

        Raises:
            RateLimitExceededError: If rate limit exceeded
        """
        # Query User by email
        user = self.db.execute(
            select(User).where(
                User.email == email,
                User.tenant_id == self.tenant_id,
            )
        ).scalars().first()

        if not user:
            # User doesn't exist - allow attempt (email enumeration protection)
            return

        # Check per-email 10-minute cooldown
        if user.last_password_reset_request_at:
            elapsed = datetime.now(UTC) - user.last_password_reset_request_at
            if elapsed < timedelta(minutes=self.RATE_LIMIT_MINUTES):
                wait_minutes = self.RATE_LIMIT_MINUTES - int(elapsed.total_seconds() / 60)
                raise RateLimitExceededError(
                    message=f"Intenta de nuevo en {wait_minutes} minutos"
                )

        # Check per-email daily limit
        if user.password_reset_attempt_count and user.password_reset_attempt_count >= self.RATE_LIMIT_DAILY_MAX:
            raise RateLimitExceededError(
                message="Límite diario de solicitudes excedido"
            )

    def _send_reset_email(self, email: str, reset_link: str) -> None:
        """Send password reset email asynchronously.

        Args:
            email: Recipient email address
            reset_link: Full reset link to include in email
        """
        # Use ThreadPoolExecutor to send email without blocking request
        # This prevents slow email service from delaying the HTTP response
        def _send():
            try:
                # Import here to avoid circular imports
                from app.common.email_service import send_password_reset_email

                send_password_reset_email(email, reset_link)
                logger.info(f"Password reset email sent to {email}")
            except Exception as e:
                logger.error(f"Failed to send password reset email to {email}: {str(e)}")
                # Don't raise - we want request to succeed even if email fails

        # Submit to thread pool for async execution
        executor = ThreadPoolExecutor(max_workers=2)
        executor.submit(_send)
