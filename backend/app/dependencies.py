"""T023: FastAPI dependency injection."""

import uuid
from typing import Annotated

from fastapi import Cookie, Depends, Header
from sqlmodel import Session

from app.common.exceptions import ForbiddenError, UnauthorizedError
from app.common.security import verify_token
from app.database import get_session


def get_db() -> Session:
    """Database session dependency."""
    session = get_session()
    try:
        yield session  # type: ignore[misc]
    finally:
        session.close()


def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> dict:
    """Extract and validate JWT from Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedError("Token no proporcionado")
    token = authorization.split(" ", 1)[1]
    payload = verify_token(token)
    if not payload or "sub" not in payload:
        raise UnauthorizedError("Token inválido o expirado")
    return payload


def get_current_tenant(
    current_user: Annotated[dict, Depends(get_current_user)],
) -> uuid.UUID:
    """Extract tenant_id from JWT."""
    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise UnauthorizedError("Tenant no encontrado en token")
    return uuid.UUID(tenant_id)


def get_refresh_token(
    refresh_token: Annotated[str | None, Cookie()] = None,
) -> str:
    """Extract refresh token from cookie."""
    if not refresh_token:
        raise UnauthorizedError("Token de refresco no proporcionado")
    return refresh_token


def require_role(*roles: str):
    """Factory for role-checking dependency."""

    def check_role(current_user: Annotated[dict, Depends(get_current_user)]) -> dict:
        user_role = current_user.get("role")
        if user_role not in roles:
            raise ForbiddenError("No tiene permisos para esta acción")
        return current_user

    return check_role


# Common dependency annotations
DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[dict, Depends(get_current_user)]
TenantId = Annotated[uuid.UUID, Depends(get_current_tenant)]
RefreshToken = Annotated[str, Depends(get_refresh_token)]
