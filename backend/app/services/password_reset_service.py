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
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from secrets import token_urlsafe
from uuid import UUID

from sqlmodel import Session, select, update

from app.common.exceptions import (
    InvalidResetTokenError,
    PasswordValidationError,
    RateLimitExceededError,
    TokenExpiredError,
)
from app.config import settings
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

        # Step 3b: Email enumeration protection
        # Only create token if user exists (prevents database bloat from spam)
        # For non-existent emails, we return the same success message
        if not user:
            # User doesn't exist - return success message without creating token
            # This prevents email enumeration attacks
            logger.info(
                "Password reset requested for non-existent email (enumeration protection)",
                extra={
                    "email": email,
                    "ip_address": ip_address,
                    "tenant_id": str(self.tenant_id),
                },
            )
            return

        # Step 3c: If user exists, invalidate previous unused tokens
        now = datetime.now(UTC)
        self.db.execute(
            update(PasswordResetToken).where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.tenant_id == self.tenant_id,
                PasswordResetToken.used_at.is_(None),
            ).values(used_at=now)
        )

        # Step 4: Generate token and hash
        plaintext_token, token_hash = self._generate_reset_token()

        # Step 5: Create PasswordResetToken in database
        expires_at = now + timedelta(hours=self.TOKEN_EXPIRATION_HOURS)

        reset_token = PasswordResetToken(
            tenant_id=self.tenant_id,
            user_id=user.id,  # user_id is never None here
            token_hash=token_hash,
            expires_at=expires_at,
            ip_address=ip_address,
            created_at=now,
        )
        self.db.add(reset_token)
        self.db.flush()

        # Step 6: Update User fields
        user.last_password_reset_request_at = now
        user.password_reset_attempt_count = (user.password_reset_attempt_count or 0) + 1
        self.db.add(user)

        # Step 7: Send email asynchronously
        frontend_url = settings.cors_origins_list[0]
        reset_link = f"{frontend_url}/password-reset?token={plaintext_token}"
        self._send_reset_email(email, reset_link)

        # Step 8: Commit database changes
        self.db.commit()

        # Step 9: Log event
        logger.info(
            "Password reset requested",
            extra={
                "user_id": str(user.id),
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
        # Step 1: Hash plaintext token with SHA256
        token_hash = hashlib.sha256(token.encode()).hexdigest()

        # Step 2: Query database for token
        token_record = self.db.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.token_hash == token_hash,
                PasswordResetToken.tenant_id == self.tenant_id,
            )
        ).scalars().first()

        if not token_record:
            logger.warning(f"Invalid token attempt (hash: {token_hash[:8]}...)")
            raise InvalidResetTokenError(
                message="El enlace de recuperación es inválido o ha expirado"
            )

        # Step 3: Check expiration (expires_at > now)
        now = datetime.now(UTC)
        expires_at = token_record.expires_at

        # Handle timezone-aware vs naive datetimes
        if expires_at.tzinfo is None:
            # If expires_at is naive, make it aware (assuming UTC)
            expires_at = expires_at.replace(tzinfo=UTC)

        if expires_at <= now:
            logger.warning(
                "Expired token used",
                extra={
                    "token_id": str(token_record.id),
                    "user_id": str(token_record.user_id) if token_record.user_id else None,
                    "expired_at": expires_at.isoformat(),
                },
            )
            raise TokenExpiredError(
                message="El enlace ha expirado. Solicita uno nuevo"
            )

        # Step 4: Check not already used (used_at IS NULL)
        if token_record.used_at is not None:
            logger.warning(
                "Already-used token attempted",
                extra={
                    "token_id": str(token_record.id),
                    "user_id": str(token_record.user_id) if token_record.user_id else None,
                    "used_at": token_record.used_at.isoformat(),
                },
            )
            raise InvalidResetTokenError(
                message="El enlace ya fue utilizado. Solicita uno nuevo"
            )

        # Step 5: Return valid token record
        logger.info(
            "Token verified successfully",
            extra={
                "token_id": str(token_record.id),
                "user_id": str(token_record.user_id) if token_record.user_id else None,
            },
        )
        return token_record

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
        # Step 1: Verify token (checks expiration, reuse, tenant isolation)
        token_record = self.verify_token(token)

        # Step 2: Validate password meets security requirements
        self._validate_password(new_password)

        # Step 3: Get User from token
        user = self.db.execute(
            select(User).where(
                User.id == token_record.user_id,
                User.tenant_id == self.tenant_id,
            )
        ).scalars().first()

        if not user:
            logger.error(
                "User not found for password reset token",
                extra={"token_id": str(token_record.id)},
            )
            raise InvalidResetTokenError(
                message="El enlace es inválido o el usuario no existe"
            )

        # Step 4: Hash new password with bcrypt (cost >= 10)
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        hashed_password = pwd_context.hash(new_password)

        # Step 5: Update User password and activate account
        user.hashed_password = hashed_password
        if not user.is_active:
            user.is_active = True
        self.db.add(user)

        # Step 6: Mark token as used
        now = datetime.now(UTC)
        token_record.used_at = now
        self.db.add(token_record)

        # Step 7: Invalidate other unused tokens for this user
        # Update all unused tokens for this user to be marked as used
        self.db.execute(
            update(PasswordResetToken).where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.tenant_id == self.tenant_id,
                PasswordResetToken.used_at.is_(None),
                PasswordResetToken.id != token_record.id,
            ).values(used_at=now)
        )

        # Step 8: Commit all changes
        self.db.commit()

        # Step 9: Log event
        logger.info(
            "Password reset successful",
            extra={
                "user_id": str(user.id),
                "email": user.email,
                "token_id": str(token_record.id),
                "tenant_id": str(self.tenant_id),
            },
        )

        # Step 10: Return updated user
        return user

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
            now = datetime.now(UTC)
            last_request = user.last_password_reset_request_at

            # Handle timezone-aware vs naive datetimes
            if last_request.tzinfo is None:
                # If last_request is naive, make it aware (assuming UTC)
                last_request = last_request.replace(tzinfo=UTC)

            elapsed = now - last_request
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
