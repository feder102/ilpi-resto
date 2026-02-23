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
    def __init__(self, message: str = "Error de validación") -> None:
        super().__init__(message, "VALIDATION_ERROR")


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
