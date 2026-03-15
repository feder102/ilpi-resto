"""
Custom exceptions for time tracking feature (Feature 008).

Handles errors specific to automatic shift-based time tracking
and work statistics calculations.
"""

import uuid
from datetime import date, time
from typing import Optional

from app.common.exceptions import DomainException


class TimeTrackingException(DomainException):
    """Base exception for time tracking operations."""
    def __init__(self, message: str = "Error en seguimiento de tiempo", code: str = "TIME_TRACKING_ERROR") -> None:
        super().__init__(message, code)


class InvalidShiftError(TimeTrackingException):
    """Raised when a shift configuration is invalid."""
    def __init__(self, message: str, shift_id: Optional[uuid.UUID] = None) -> None:
        self.shift_id = shift_id
        super().__init__(message, "INVALID_SHIFT")


class DuplicateTimeEntryError(TimeTrackingException):
    """Raised when attempting to create a duplicate time entry."""
    def __init__(self, employee_id: uuid.UUID, shift_date: date, shift_type_id: uuid.UUID) -> None:
        self.employee_id = employee_id
        self.shift_date = shift_date
        self.shift_type_id = shift_type_id
        message = f"Ya existe una entrada de tiempo para el empleado {employee_id} en {shift_date} para el tipo de turno {shift_type_id}"
        super().__init__(message, "DUPLICATE_TIME_ENTRY")


class StatisticsCalculationError(TimeTrackingException):
    """Raised when statistics calculation fails."""
    def __init__(self, message: str, employee_id: Optional[uuid.UUID] = None, period: Optional[str] = None) -> None:
        self.employee_id = employee_id
        self.period = period
        super().__init__(message, "STATISTICS_CALCULATION_ERROR")


class NoShiftsFoundError(TimeTrackingException):
    """Raised when no shifts are found for a given employee or date."""
    def __init__(self, employee_id: Optional[uuid.UUID] = None, target_date: Optional[date] = None) -> None:
        self.employee_id = employee_id
        self.target_date = target_date
        message = f"No se encontraron turnos para el empleado {employee_id} en {target_date}"
        super().__init__(message, "NO_SHIFTS_FOUND")


class HoursCalculationError(TimeTrackingException):
    """Raised when hours calculation fails (e.g., invalid start/end times)."""
    def __init__(self, start_time: time, end_time: time, message: Optional[str] = None) -> None:
        self.start_time = start_time
        self.end_time = end_time
        default_msg = f"Error al calcular horas entre {start_time} y {end_time}"
        super().__init__(message or default_msg, "HOURS_CALCULATION_ERROR")


class BatchProcessingError(TimeTrackingException):
    """Raised when batch processing encounters an error."""
    def __init__(self, message: str, target_date: Optional[date] = None, entries_processed: int = 0) -> None:
        self.target_date = target_date
        self.entries_processed = entries_processed
        super().__init__(message, "BATCH_PROCESSING_ERROR")
