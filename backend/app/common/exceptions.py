"""T015: Domain exception hierarchy."""


class DomainException(Exception):
    """Base domain exception."""

    def __init__(self, message: str, code: str = "DOMAIN_ERROR") -> None:
        self.message = message
        self.code = code
        super().__init__(message)


class NotFoundError(DomainException):
    def __init__(self, message: str = "Recurso no encontrado") -> None:
        super().__init__(message, "NOT_FOUND")


class DuplicateError(DomainException):
    def __init__(self, message: str = "El recurso ya existe", code: str = "DUPLICATE") -> None:
        super().__init__(message, code)


class ValidationError(DomainException):
    def __init__(self, message: str = "Error de validación", code: str = "VALIDATION_ERROR") -> None:
        super().__init__(message, code)


class UnauthorizedError(DomainException):
    def __init__(self, message: str = "No autorizado") -> None:
        super().__init__(message, "UNAUTHORIZED")


class ForbiddenError(DomainException):
    def __init__(self, message: str = "Acceso denegado") -> None:
        super().__init__(message, "FORBIDDEN")


class ConflictError(DomainException):
    def __init__(self, message: str = "Conflicto de versión") -> None:
        super().__init__(message, "CONFLICT")


class BalanceExceededError(DomainException):
    def __init__(self, message: str = "Saldo insuficiente") -> None:
        super().__init__(message, "BALANCE_EXCEEDED")


class ShiftTypeInUseError(DomainException):
    """T004: Raised when trying to delete a shift type with active team assignments."""

    def __init__(
        self, message: str = "El tipo de turno está asignado a uno o más equipos"
    ) -> None:
        super().__init__(message, "SHIFT_TYPE_IN_USE")


class InvalidShiftTypeError(DomainException):
    """T004: Raised when shift type is invalid or doesn't exist."""

    def __init__(
        self, message: str = "Tipo de turno inválido o no configurado"
    ) -> None:
        super().__init__(message, "INVALID_SHIFT_TYPE")


# ============================================================================
# NEW EXCEPTIONS FOR SHIFT ROSTER CALENDAR (Feature 004)
# ============================================================================


class ShiftConflictError(DomainException):
    """Raised when trying to assign a shift to an employee who already has a shift on that date."""

    def __init__(self, message: str = "El empleado ya tiene un turno asignado en esa fecha") -> None:
        super().__init__(message, "SHIFT_CONFLICT_001")


class VacationOverlapWarning(DomainException):
    """Warning raised when assigning a shift to an employee with approved vacation on that date."""

    def __init__(
        self, message: str = "El empleado tiene vacaciones aprobadas en esa fecha"
    ) -> None:
        super().__init__(message, "VACATION_OVERLAP_WARNING_001")


# ============================================================================
# NEW EXCEPTIONS FOR MODERATOR PORTAL (Feature 006)
# ============================================================================


class EmployeeNotInDepartmentError(DomainException):
    """Raised when trying to manage an employee outside moderator's department."""

    def __init__(
        self, message: str = "El empleado no pertenece a tu departamento"
    ) -> None:
        super().__init__(message, "EMPLOYEE_NOT_IN_DEPARTMENT")


class VacationConflictError(DomainException):
    """Raised when trying to assign a shift during an approved vacation."""

    def __init__(
        self, message: str = "El empleado tiene vacaciones aprobadas en esa fecha"
    ) -> None:
        super().__init__(message, "VACATION_CONFLICT")


class ShiftExistsError(DomainException):
    """Raised when employee already has a shift assigned on that date."""

    def __init__(
        self, message: str = "El empleado ya tiene un turno asignado en esa fecha"
    ) -> None:
        super().__init__(message, "SHIFT_EXISTS")


# ============================================================================
# EXCEPTION HANDLER DECORATOR (for FastAPI routes)
# ============================================================================

from functools import wraps
from fastapi import HTTPException


def handle_exceptions(func):
    """
    Decorator to handle domain exceptions in FastAPI routes.

    Converts DomainException instances to appropriate HTTP responses:
    - NotFoundError → 404
    - UnauthorizedError → 401
    - ForbiddenError → 403
    - ValidationError → 400
    - ConflictError/ShiftConflictError → 409
    - Other DomainException → 400
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except UnauthorizedError as e:
            raise HTTPException(status_code=401, detail={"error": {"message": e.message, "code": e.code}})
        except ForbiddenError as e:
            raise HTTPException(status_code=403, detail={"error": {"message": e.message, "code": e.code}})
        except NotFoundError as e:
            raise HTTPException(status_code=404, detail={"error": {"message": e.message, "code": e.code}})
        except ValidationError as e:
            raise HTTPException(status_code=400, detail={"error": {"message": e.message, "code": e.code}})
        except (ConflictError, ShiftConflictError) as e:
            raise HTTPException(status_code=409, detail={"error": {"message": e.message, "code": e.code}})
        except DomainException as e:
            raise HTTPException(status_code=400, detail={"error": {"message": e.message, "code": e.code}})
    return wrapper
