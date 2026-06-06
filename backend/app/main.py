"""T022: FastAPI application factory."""

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.common.exceptions import (
    BalanceExceededError,
    ConflictError,
    DomainError,
    DuplicateError,
    ForbiddenError,
    InvalidShiftTypeError,
    NotFoundError,
    ShiftTypeInUseError,
    UnauthorizedError,
    ValidationError,
)
from app.config import settings

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)

EXCEPTION_STATUS_MAP: dict[type[DomainError], int] = {
    NotFoundError: 404,
    UnauthorizedError: 401,
    ForbiddenError: 403,
    ValidationError: 422,
    DuplicateError: 409,
    ConflictError: 409,
    BalanceExceededError: 409,
    ShiftTypeInUseError: 409,
    InvalidShiftTypeError: 422,
}


def create_app() -> FastAPI:
    app = FastAPI(title="ILPI Kitchen Staff Management", version="1.0.0")

    @app.get("/health", tags=["health"])
    async def health_check() -> dict[str, str]:
        return {"status": "ok"}

    # Initialize background scheduler for automatic time tracking (Feature 008)
    @app.on_event("startup")
    async def startup_scheduler() -> None:
        try:
            from app.jobs import start_scheduler
            start_scheduler(
                batch_hour=settings.batch_time_tracking_hour,
                batch_minute=settings.batch_time_tracking_minute,
            )
            logger.info("Background scheduler initialized for automatic time tracking")
        except ImportError as e:
            logger.warning(f"APScheduler not available, skipping background scheduler: {str(e)}")
        except Exception as e:
            logger.error(f"Failed to initialize scheduler: {str(e)}")

    @app.on_event("shutdown")
    async def shutdown_scheduler() -> None:
        from app.jobs import stop_scheduler
        try:
            stop_scheduler()
            logger.info("Background scheduler stopped")
        except Exception as e:
            logger.error(f"Error stopping scheduler: {str(e)}")

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Security headers middleware
    @app.middleware("http")
    async def add_security_headers(request: Request, call_next):  # type: ignore[no-untyped-def]
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

    # T080: Audit logging middleware for security-relevant events
    audit_logger = logging.getLogger("audit")

    @app.middleware("http")
    async def audit_logging(request: Request, call_next):  # type: ignore[no-untyped-def]
        response = await call_next(request)
        path = request.url.path
        method = request.method

        # Log security-relevant actions
        audit_paths = {
            ("POST", "/auth/login"): "LOGIN_ATTEMPT",
            ("POST", "/auth/logout"): "LOGOUT",
            ("POST", "/employees"): "EMPLOYEE_CREATE",
            ("PUT", "/employees"): "EMPLOYEE_UPDATE",
            ("DELETE", "/employees"): "EMPLOYEE_DELETE",
            ("PUT", "/vacations"): "VACATION_ACTION",
            ("POST", "/users"): "USER_CREATE",
        }

        for (m, p), action in audit_paths.items():
            if method == m and p in path:
                audit_logger.info(
                    "audit_event",
                    extra={
                        "action": action,
                        "path": path,
                        "method": method,
                        "status_code": response.status_code,
                        "client_ip": request.client.host if request.client else "unknown",
                    },
                )
                break

        # Log access denied
        if response.status_code in (401, 403):
            audit_logger.warning(
                "access_denied",
                extra={
                    "path": path,
                    "method": method,
                    "status_code": response.status_code,
                    "client_ip": request.client.host if request.client else "unknown",
                },
            )

        return response

    # Global exception handler
    @app.exception_handler(DomainError)
    async def domain_exception_handler(request: Request, exc: DomainError) -> JSONResponse:
        # PASSWORD_SETUP_REQUIRED is semantically Forbidden (403), not Unprocessable (422)
        if exc.code == "PASSWORD_SETUP_REQUIRED":
            status_code = 403
        else:
            status_code = EXCEPTION_STATUS_MAP.get(type(exc), 400)
        return JSONResponse(
            status_code=status_code,
            content={"error": {"code": exc.code, "message": exc.message}},
        )

    # Configure structured JSON logging
    _configure_logging()

    # Include routers
    _include_routers(app)

    return app


def _configure_logging() -> None:
    from pythonjsonlogger.json import JsonFormatter

    handler = logging.StreamHandler()
    formatter = JsonFormatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s",
        rename_fields={"asctime": "timestamp", "levelname": "level"},
    )
    handler.setFormatter(formatter)
    logging.root.handlers = [handler]
    logging.root.setLevel(settings.LOG_LEVEL)


def _include_routers(app: FastAPI) -> None:
    from app.routers import (
        auth,
        dashboard,
        employees,
        moderator,
        password_reset_router,
        shift_types,
        shifts,
        teams,
        time_tracking,
        users,
        vacations,
    )

    prefix = "/api/v1"
    app.include_router(auth.router, prefix=prefix)
    app.include_router(users.router, prefix=prefix)
    app.include_router(employees.router, prefix=prefix)
    app.include_router(shift_types.router, prefix=prefix)
    app.include_router(teams.router, prefix=prefix)
    app.include_router(shifts.router, prefix=prefix)
    app.include_router(vacations.router, prefix=prefix)
    app.include_router(moderator.router, prefix=prefix)
    app.include_router(dashboard.router, prefix=prefix)
    app.include_router(time_tracking.router, prefix=prefix)
    # T020: Register password reset router for password recovery endpoints
    app.include_router(password_reset_router.router, prefix=prefix)


app = create_app()
