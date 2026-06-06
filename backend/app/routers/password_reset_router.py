"""T019-T020: Password Reset Router Endpoints.

Provides REST API endpoints for password recovery flow:
- POST /auth/password-reset/request - Request password reset link
- GET /auth/password-reset/verify - Verify token validity (T030)
- POST /auth/password-reset/verify - Verify token and reset password (T042)
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlmodel import Session, select

from app.common.exceptions import (
    InvalidResetTokenError,
    PasswordValidationError,
    RateLimitExceededError,
    TokenExpiredError,
)
from app.dependencies import get_db
from app.models.tenant import Tenant
from app.schemas.password_reset import (
    PasswordResetRequestResponse,
    PasswordResetRequestSchema,
    PasswordResetVerifyResponse,
    PasswordResetVerifySchema,
)
from app.services.password_reset_service import PasswordResetService

# Initialize router
router = APIRouter(prefix="/auth/password-reset", tags=["password-reset"])

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)


# Helper function to get tenant ID (inline version)
def _get_tenant_id_from_request(request: Request, db: Session) -> UUID:
    """Get tenant ID from header, or use default 'ilpi' tenant for public password reset endpoints.

    Since password reset is a public endpoint (no authentication required),
    we use the default tenant "ilpi" if no X-Tenant-ID header is provided.
    """
    tenant_id_str = request.headers.get("X-Tenant-ID")

    if tenant_id_str:
        # If header provided, validate and use it
        try:
            return UUID(tenant_id_str)
        except ValueError as e:
            raise HTTPException(status_code=400, detail="Invalid tenant ID format") from e

    # Fallback to default "ilpi" tenant for public endpoints
    statement = select(Tenant).where(Tenant.slug == "ilpi")
    tenant = db.exec(statement).first()

    if not tenant:
        raise HTTPException(
            status_code=500,
            detail="Default tenant not found. System configuration error."
        )

    return tenant.id


# ============================================================================
# T019: POST /auth/password-reset/request - Request Password Reset
# ============================================================================


@router.post("/request", response_model=PasswordResetRequestResponse)
@limiter.limit("10/minute")  # Per-IP rate limit: 10 requests per minute
async def request_password_reset(
    request: Request,
    data: PasswordResetRequestSchema,
    db: Session = Depends(get_db),
) -> PasswordResetRequestResponse:
    """Request a password reset link.

    **T019: Endpoint Implementation**

    POST /auth/password-reset/request
    ```json
    {"email": "user@example.com"}
    ```

    Returns:
    - 200 OK: Success message (same response for registered and unregistered emails - enumeration protection)
    - 400 Bad Request: Invalid email format
    - 429 Too Many Requests: Rate limit exceeded (per-email or per-IP)
    - 503 Service Unavailable: Email service failure

    **Email Enumeration Protection**: Both registered and unregistered emails return identical 200 success response.
    Actual email existence is silently logged for audit but never revealed to client.

    **Rate Limiting**:
    - Per-IP (FastAPI Limiter): 10 requests per minute (prevents distributed brute force)
    - Per-email (Service layer): 1 request per 10 minutes, 5 per day (prevents account enumeration and spam)
    """
    # Get IP address from request
    ip_address = request.client.host if request.client else "unknown"

    # Get tenant ID (with fallback to default "ilpi" tenant)
    tenant_id = _get_tenant_id_from_request(request, db)

    try:
        # Create service and request password reset
        service = PasswordResetService(db=db, tenant_id=tenant_id)
        service.request_password_reset(email=data.email, ip_address=ip_address)

        # Return success response (always same response for enumeration protection)
        return PasswordResetRequestResponse(
            message="Se ha enviado un enlace de recuperación de contraseña a tu email",
            expires_in_hours=24,
            note="Revisa tu bandeja de entrada (incluida spam)",
        )

    except RateLimitExceededError as e:
        # Return 429 with retry information
        raise HTTPException(
            status_code=429,
            detail={
                "error": {
                    "code": e.code,
                    "message": e.message,
                    "retry_after_seconds": 600,  # 10 minutes in seconds
                }
            },
            headers={"Retry-After": "600"},
        ) from e
    except Exception as e:
        # Log unexpected errors
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error in password reset request: {str(e)}")

        raise HTTPException(
            status_code=500,
            detail="Error processing password reset request",
        ) from e


# ============================================================================
# T030: GET /auth/password-reset/verify - Verify Token Validity (Optional)
# ============================================================================


@router.get("/verify")
@limiter.limit("20/minute")  # Token checks are fast, allow more
async def check_token_validity(
    token: str,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    """Verify if a password reset token is valid (optional convenience endpoint).

    **T030: Token Verification Endpoint**

    GET /auth/password-reset/verify?token=abc123

    Returns:
    - 200 OK: {valid: true, user_email, expires_at}
    - 400 Bad Request: {error: {code: INVALID_RESET_TOKEN}}
    - 410 Gone: {error: {code: TOKEN_EXPIRED}} if token expired

    This endpoint is optional - primarily for frontend to validate token on page load.
    """
    # Get tenant ID (with fallback to default "ilpi" tenant)
    tenant_id = _get_tenant_id_from_request(request, db)

    try:
        service = PasswordResetService(db=db, tenant_id=tenant_id)
        token_record = service.verify_token(token)

        return {
            "valid": True,
            "expires_at": token_record.expires_at.isoformat(),
        }

    except TokenExpiredError as e:
        raise HTTPException(
            status_code=410,  # 410 Gone - resource no longer available
            detail={"error": {"code": e.code, "message": e.message}},
        ) from e
    except InvalidResetTokenError as e:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": e.code, "message": e.message}},
        ) from e


# ============================================================================
# T042: POST /auth/password-reset/verify - Reset Password with Token
# ============================================================================


@router.post("/verify", response_model=PasswordResetVerifyResponse)
@limiter.limit("5/minute")  # Password resets are sensitive, limit strictly
async def verify_and_reset_password(
    request: Request,
    data: PasswordResetVerifySchema,
    db: Session = Depends(get_db),
) -> PasswordResetVerifyResponse:
    """Verify token and set new password.

    **T042: Password Reset Endpoint**

    POST /auth/password-reset/verify
    ```json
    {
        "token": "abc123...",
        "new_password": "SecurePass123!"
    }
    ```

    Returns:
    - 200 OK: Success + redirect to login
    - 400 Bad Request: Invalid or already-used token
    - 410 Gone: Token expired
    - 422 Unprocessable Entity: Password validation failed (includes which requirements failed)

    **Security**:
    - Strict rate limiting (5 req/min) to prevent abuse
    - Password complexity requirements enforced
    - Token marked as used, preventing reuse
    - Other unused tokens for same user invalidated
    """
    # Get tenant ID (with fallback to default "ilpi" tenant)
    tenant_id = _get_tenant_id_from_request(request, db)

    try:
        service = PasswordResetService(db=db, tenant_id=tenant_id)
        user = service.verify_and_reset_password(
            token=data.token,
            new_password=data.new_password,
        )

        return PasswordResetVerifyResponse(
            message="Contraseña restablecida exitosamente",
            action="redirect_to_login",
            redirect_url="/login",
            user={"id": str(user.id), "email": user.email},
        )

    except TokenExpiredError as e:
        raise HTTPException(
            status_code=410,
            detail={"error": {"code": e.code, "message": e.message}},
        ) from e
    except InvalidResetTokenError as e:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": e.code, "message": e.message}},
        ) from e
    except PasswordValidationError as e:
        raise HTTPException(
            status_code=422,
            detail={"error": {"code": e.code, "message": e.message}},
        ) from e
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error in password reset: {str(e)}")

        raise HTTPException(
            status_code=500,
            detail="Error processing password reset",
        ) from e
