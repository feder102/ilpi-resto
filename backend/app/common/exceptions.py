"""T015: Domain exception hierarchy."""

from collections.abc import Callable
from functools import wraps
from typing import Any

from fastapi import HTTPException


class DomainError(Exception):
    """Base domain exception."""

    def __init__(self, message: str, code: str = "DOMAIN_ERROR") -> None:
        self.message = message
        self.code = code
        super().__init__(message)


class NotFoundError(DomainError):
    def __init__(self, message: str = "Recurso no encontrado") -> None:
        super().__init__(message, "NOT_FOUND")


class DuplicateError(DomainError):
    def __init__(self, message: str = "El recurso ya existe", code: str = "DUPLICATE") -> None:
        super().__init__(message, code)


class ValidationError(DomainError):
    def __init__(self, message: str = "Error de validación", code: str = "VALIDATION_ERROR") -> None:
        super().__init__(message, code)


class UnauthorizedError(DomainError):
    def __init__(self, message: str = "No autorizado") -> None:
        super().__init__(message, "UNAUTHORIZED")


class ForbiddenError(DomainError):
    def __init__(self, message: str = "Acceso denegado") -> None:
        super().__init__(message, "FORBIDDEN")


class ConflictError(DomainError):
    def __init__(self, message: str = "Conflicto de versión") -> None:
        super().__init__(message, "CONFLICT")


class BalanceExceededError(DomainError):
    def __init__(self, message: str = "Saldo insuficiente") -> None:
        super().__init__(message, "BALANCE_EXCEEDED")


class ShiftTypeInUseError(DomainError):
    """T004: Raised when trying to delete a shift type with active team assignments."""

    def __init__(
        self, message: str = "El tipo de turno está asignado a uno o más equipos"
    ) -> None:
        super().__init__(message, "SHIFT_TYPE_IN_USE")


class InvalidShiftTypeError(DomainError):
    """T004: Raised when shift type is invalid or doesn't exist."""

    def __init__(
        self, message: str = "Tipo de turno inválido o no configurado"
    ) -> None:
        super().__init__(message, "INVALID_SHIFT_TYPE")


# ============================================================================
# NEW EXCEPTIONS FOR SHIFT ROSTER CALENDAR (Feature 004)
# ============================================================================


class ShiftConflictError(DomainError):
    """Raised when trying to assign a shift to an employee who already has a shift on that date."""

    def __init__(self, message: str = "El empleado ya tiene un turno asignado en esa fecha") -> None:
        super().__init__(message, "SHIFT_CONFLICT_001")


class VacationOverlapError(DomainError):
    """Raised when assigning a shift to an employee with approved vacation on that date."""

    def __init__(
        self, message: str = "El empleado tiene vacaciones aprobadas en esa fecha"
    ) -> None:
        super().__init__(message, "VACATION_OVERLAP_WARNING_001")


# ============================================================================
# NEW EXCEPTIONS FOR MODERATOR PORTAL (Feature 006)
# ============================================================================


class EmployeeNotInDepartmentError(DomainError):
    """Raised when trying to manage an employee outside moderator's department."""

    def __init__(
        self, message: str = "El empleado no pertenece a tu departamento"
    ) -> None:
        super().__init__(message, "EMPLOYEE_NOT_IN_DEPARTMENT")


# ============================================================================
# NEW EXCEPTIONS FOR PASSWORD RECOVERY (Feature 007)
# ============================================================================


class InvalidResetTokenError(DomainError):
    """Raised when password reset token is invalid, expired, or already used."""

    def __init__(
        self, message: str = "El enlace de recuperación es inválido o ha expirado"
    ) -> None:
        super().__init__(message, "INVALID_RESET_TOKEN")


class TokenExpiredError(DomainError):
    """Raised when password reset token has expired (>24 hours)."""

    def __init__(self, message: str = "El enlace ha expirado. Solicita uno nuevo") -> None:
        super().__init__(message, "TOKEN_EXPIRED")


class RateLimitExceededError(DomainError):
    """Raised when rate limit is exceeded for password reset requests."""

    def __init__(self, message: str = "Demasiados intentos. Intenta de nuevo más tarde") -> None:
        super().__init__(message, "RATE_LIMIT_EXCEEDED")


class PasswordValidationError(DomainError):
    """Raised when new password doesn't meet security requirements."""

    def __init__(
        self, message: str = "La contraseña no cumple con los requisitos"
    ) -> None:
        super().__init__(message, "PASSWORD_VALIDATION_FAILED")


class VacationConflictError(DomainError):
    """Raised when trying to assign a shift during an approved vacation."""

    def __init__(
        self, message: str = "El empleado tiene vacaciones aprobadas en esa fecha"
    ) -> None:
        super().__init__(message, "VACATION_CONFLICT")


class AdvanceNoticeRequiredError(DomainError):
    def __init__(
        self,
        message: str = "Las vacaciones deben solicitarse con al menos 2 meses de anticipación",
    ) -> None:
        super().__init__(message, "ADVANCE_NOTICE_REQUIRED")


class ShiftExistsError(DomainError):
    """Raised when employee already has a shift assigned on that date."""

    def __init__(
        self, message: str = "El empleado ya tiene un turno asignado en esa fecha"
    ) -> None:
        super().__init__(message, "SHIFT_EXISTS")


# ============================================================================
# EXCEPTION HANDLER DECORATOR (for FastAPI routes)
# ============================================================================


def handle_exceptions(func: Callable[..., Any]) -> Callable[..., Any]:
    """
    Decorator to handle domain exceptions in FastAPI routes.

    Converts DomainError instances to appropriate HTTP responses:
    - NotFoundError → 404
    - UnauthorizedError → 401
    - ForbiddenError → 403
    - ValidationError → 400
    - ConflictError/ShiftConflictError → 409
    - Other DomainError → 400
    """
    @wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        try:
            return func(*args, **kwargs)
        except UnauthorizedError as e:
            raise HTTPException(status_code=401, detail={"error": {"message": e.message, "code": e.code}}) from e
        except ForbiddenError as e:
            raise HTTPException(status_code=403, detail={"error": {"message": e.message, "code": e.code}}) from e
        except NotFoundError as e:
            raise HTTPException(status_code=404, detail={"error": {"message": e.message, "code": e.code}}) from e
        except ValidationError as e:
            raise HTTPException(status_code=400, detail={"error": {"message": e.message, "code": e.code}}) from e
        except (ConflictError, ShiftConflictError) as e:
            raise HTTPException(status_code=409, detail={"error": {"message": e.message, "code": e.code}}) from e
        except DomainError as e:
            raise HTTPException(status_code=400, detail={"error": {"message": e.message, "code": e.code}}) from e
    return wrapper
