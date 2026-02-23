"""T037: Authentication service."""

import uuid
from datetime import datetime, timezone

from sqlmodel import Session, select

from app.common.exceptions import UnauthorizedError
from app.common.security import (
    create_access_token,
    create_refresh_token,
    verify_password,
    verify_token,
)
from app.models.user import User
from app.schemas.auth import LoginResponse, UserResponse

# Simple in-memory blacklist for MVP (use Redis in production)
_blacklisted_tokens: set[str] = set()


def login(email: str, password: str, session: Session) -> tuple[LoginResponse, str]:
    """Authenticate user and return tokens.

    Returns (login_response, refresh_token_string).
    """
    statement = select(User).where(User.email == email, User.is_active == True)  # noqa: E712
    user = session.exec(statement).first()

    if not user or not verify_password(password, user.hashed_password):
        raise UnauthorizedError("Credenciales inválidas")

    token_data = {
        "sub": str(user.id),
        "tenant_id": str(user.tenant_id),
        "role": user.role,
    }
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    user_response = UserResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        tenant_id=user.tenant_id,
        employee_id=user.employee_id,
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
    }
    new_access = create_access_token(token_data)
    new_refresh = create_refresh_token(token_data)

    user_response = UserResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        tenant_id=user.tenant_id,
        employee_id=user.employee_id,
    )

    return (
        LoginResponse(access_token=new_access, user=user_response),
        new_refresh,
    )


def logout(refresh_token_str: str) -> None:
    """Blacklist the refresh token."""
    _blacklisted_tokens.add(refresh_token_str)
