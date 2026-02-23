"""T038: Auth router with login, refresh, logout endpoints."""

from fastapi import APIRouter, Request, Response
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.dependencies import DbSession, RefreshToken
from app.schemas.auth import LoginRequest, LoginResponse
from app.services import auth_service

router = APIRouter(tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/auth/login", response_model=LoginResponse)
@limiter.limit("10/minute")
def login(request: Request, body: LoginRequest, response: Response, session: DbSession):
    login_response, refresh_token = auth_service.login(body.email, body.password, session)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,  # Set True in production with HTTPS
        samesite="lax",
        max_age=7 * 24 * 60 * 60,  # 7 days
    )
    return login_response


@router.post("/auth/refresh", response_model=LoginResponse)
def refresh(response: Response, session: DbSession, refresh_token: RefreshToken):
    login_response, new_refresh = auth_service.refresh(refresh_token, session)
    response.set_cookie(
        key="refresh_token",
        value=new_refresh,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=7 * 24 * 60 * 60,
    )
    return login_response


@router.post("/auth/logout", status_code=204)
def logout(response: Response, refresh_token: RefreshToken):
    auth_service.logout(refresh_token)
    response.delete_cookie("refresh_token")
