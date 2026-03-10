"""T037: Authentication service."""

import uuid
import re
from datetime import UTC, datetime

from sqlmodel import Session, select

from app.common.exceptions import UnauthorizedError, ValidationError, NotFoundError
from app.common.security import (
    create_access_token,
    create_refresh_token,
    verify_password,
    verify_token,
    hash_password,
)
from app.models.user import User
from app.schemas.auth import LoginResponse, UserResponse, PasswordSetupResponse

# Simple in-memory blacklist for MVP (use Redis in production)
_blacklisted_tokens: set[str] = set()


def login(email: str, password: str, session: Session) -> tuple[LoginResponse, str]:
    """Authenticate user and return tokens.

    Returns (login_response, refresh_token_string).

    Raises:
        UnauthorizedError: Invalid credentials (401)
        ValidationError: Password setup required (403)
    """
    # First check if user exists (active or inactive)
    statement = select(User).where(User.email == email)
    user = session.exec(statement).first()

    if not user or not verify_password(password, user.hashed_password):
        raise UnauthorizedError("Credenciales inválidas")

    # CRITICAL SECURITY: Check if password setup is complete (is_active=true)
    if not user.is_active:
        raise ValidationError(
            code="PASSWORD_SETUP_REQUIRED",
            message="Debes completar la configuración de contraseña. Revisa tu correo electrónico para el enlace de activación."
        )

    token_data = {
        "sub": str(user.id),
        "tenant_id": str(user.tenant_id),
        "role": user.role,
        "employee_id": str(user.employee_id) if user.employee_id else None,
    }
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    user_response = UserResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        tenant_id=user.tenant_id,
        employee_id=user.employee_id,
        is_active=user.is_active,
    )

    return (
        LoginResponse(access_token=access_token, user=user_response),
        refresh_token,
    )


def refresh(refresh_token_str: str, session: Session) -> tuple[LoginResponse, str]:
    """Validate refresh token and return new tokens."""
    if refresh_token_str in _blacklisted_tokens:
        raise UnauthorizedError("Token de refresco inválido")

    payload = verify_token(refresh_token_str)
    if not payload or payload.get("type") != "refresh":
        raise UnauthorizedError("Token de refresco inválido o expirado")

    user_id = payload.get("sub")
    user = session.get(User, uuid.UUID(user_id))
    if not user or not user.is_active:
        raise UnauthorizedError("Usuario no encontrado o desactivado")

    # Blacklist old refresh token
    _blacklisted_tokens.add(refresh_token_str)

    token_data = {
        "sub": str(user.id),
        "tenant_id": str(user.tenant_id),
        "role": user.role,
        "employee_id": str(user.employee_id) if user.employee_id else None,
    }
    new_access = create_access_token(token_data)
    new_refresh = create_refresh_token(token_data)

    user_response = UserResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        tenant_id=user.tenant_id,
        employee_id=user.employee_id,
        is_active=user.is_active,
    )

    return (
        LoginResponse(access_token=new_access, user=user_response),
        new_refresh,
    )


def logout(refresh_token_str: str) -> None:
    """Blacklist the refresh token."""
    _blacklisted_tokens.add(refresh_token_str)


def setup_password(
    token: str,
    password: str,
    password_confirm: str,
    session: Session
) -> PasswordSetupResponse:
    """Set password for employee via email token (Feature 005).

    Args:
        token: Time-limited password reset token
        password: New password (must be strong)
        password_confirm: Confirmation (must match password)
        session: Database session

    Returns:
        PasswordSetupResponse with redirect URL

    Raises:
        NotFoundError: Token not found or already used
        UnauthorizedError: Token expired
        ValidationError: Password validation failed
    """
    # Validate password and confirmation match
    if password != password_confirm:
        raise ValidationError("Las contraseñas no coinciden")

    # Validate password strength: 8+ chars, mixed case, numbers
    if len(password) < 8:
        raise ValidationError("La contraseña debe tener al menos 8 caracteres")

    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)

    if not (has_upper and has_lower and has_digit):
        raise ValidationError(
            "La contraseña debe contener letras mayúsculas, minúsculas y números"
        )

    # Find user with matching token
    statement = select(User).where(User.password_reset_token == token)
    user = session.exec(statement).first()

    if not user:
        raise NotFoundError("Token inválido o ya ha sido utilizado")

    # Verify token not expired
    if user.password_reset_expires is None or datetime.now(UTC) > user.password_reset_expires:
        raise UnauthorizedError("El enlace de restablecimiento ha expirado. Solicite uno nuevo")

    # Set password and mark active
    user.hashed_password = hash_password(password)
    user.is_active = True
    user.password_reset_token = None  # Consume token (one-time use)
    user.password_reset_expires = None
    user.last_login = datetime.now(UTC)

    session.add(user)
    session.commit()
    session.refresh(user)

    return PasswordSetupResponse(
        message="Contraseña establecida correctamente. Ya puede iniciar sesión",
        redirect_url="/login"
    )
