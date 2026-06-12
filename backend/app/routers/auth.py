"""T038: Auth router with login, refresh, logout endpoints."""

from fastapi import APIRouter, Request, Response
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings
from app.dependencies import DbSession, RefreshToken
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    PasswordSetupRequest,
    PasswordSetupResponse,
)
from app.services import auth_service

router = APIRouter(tags=["auth"])
limiter = Limiter(key_func=get_remote_address)

# Cookie attributes for the refresh_token (env-driven for cross-site deployments)
_COOKIE_KWARGS = {
    "httponly": True,
    "secure": settings.COOKIE_SECURE,
    "samesite": settings.COOKIE_SAMESITE,
}


@router.post("/auth/login", response_model=LoginResponse)
@limiter.limit("10/minute")
def login(request: Request, body: LoginRequest, response: Response, session: DbSession):
    try:
        login_response, refresh_token = auth_service.login(body.email, body.password, session)
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            max_age=7 * 24 * 60 * 60,  # 7 days
            **_COOKIE_KWARGS,
        )
        return login_response
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Login error: {e}", exc_info=True)
        raise


@router.post("/auth/refresh", response_model=LoginResponse)
def refresh(response: Response, session: DbSession, refresh_token: RefreshToken):
    login_response, new_refresh = auth_service.refresh(refresh_token, session)
    response.set_cookie(
        key="refresh_token",
        value=new_refresh,
        max_age=7 * 24 * 60 * 60,
        **_COOKIE_KWARGS,
    )
    return login_response


@router.post("/auth/logout", status_code=204)
def logout(response: Response, refresh_token: RefreshToken):
    auth_service.logout(refresh_token)
    response.delete_cookie(
        "refresh_token",
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
        httponly=True,
    )


# Feature 005: Password Setup Endpoint
@router.post("/auth/password-setup", response_model=PasswordSetupResponse, status_code=200)
def password_setup(body: PasswordSetupRequest, session: DbSession):
    """Set password for employee via email token.

    Feature 005: Employee Workspace Portal
    Allows employees to set their password using a time-limited email token.
    """
    try:
        return auth_service.setup_password(
            body.token,
            body.password,
            body.password_confirm,
            session
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Password setup error: {e}", exc_info=True)
        raise
