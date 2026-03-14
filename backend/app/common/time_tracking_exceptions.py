"""
Custom exceptions for time tracking feature (Feature 008).

Handles errors specific to automatic shift-based time tracking
and work statistics calculations.
"""

from typing import Optional


class TimeTrackingException(Exception):
    """Base exception for time tracking operations."""
    pass


class InvalidShiftError(TimeTrackingException):
    """Raised when a shift configuration is invalid."""
    def __init__(self, message: str, shift_id: Optional[int] = None):
        self.message = message
        self.shift_id = shift_id
        super().__init__(message)


class DuplicateTimeEntryError(TimeTrackingException):
    """Raised when attempting to create a duplicate time entry."""
    def __init__(self, employee_id: int, shift_date, shift_type_id: int):
        self.employee_id = employee_id
        self.shift_date = shift_date
        self.shift_type_id = shift_type_id
        message = f"Time entry already exists for employee {employee_id} on {shift_date} for shift type {shift_type_id}"
        super().__init__(message)


class StatisticsCalculationError(TimeTrackingException):
    """Raised when statistics calculation fails."""
    def __init__(self, message: str, employee_id: Optional[int] = None, period: Optional[str] = None):
        self.message = message
        self.employee_id = employee_id
        self.period = period
        super().__init__(message)


class NoShiftsFoundError(TimeTrackingException):
    """Raised when no shifts are found for a given employee or date."""
    def __init__(self, employee_id: Optional[int] = None, target_date = None):
        self.employee_id = employee_id
        self.target_date = target_date
        message = f"No shifts found for employee {employee_id} on {target_date}"
        super().__init__(message)


class HoursCalculationError(TimeTrackingException):
    """Raised when hours calculation fails (e.g., invalid start/end times)."""
    def __init__(self, start_time, end_time, message: Optional[str] = None):
        self.start_time = start_time
        self.end_time = end_time
        default_msg = f"Failed to calculate hours between {start_time} and {end_time}"
        super().__init__(message or default_msg)


class BatchProcessingError(TimeTrackingException):
    """Raised when batch processing encounters an error."""
    def __init__(self, message: str, target_date = None, entries_processed: int = 0):
        self.message = message
        self.target_date = target_date
        self.entries_processed = entries_processed
        super().__init__(message)
