"""T002: Shift type Pydantic DTOs."""

import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator


class TimeWindow(BaseModel):
    """Single time window in a shift."""

    start: str  # HH:MM format
    end: str    # HH:MM format

    @field_validator("start", "end")
    @classmethod
    def validate_time_format(cls, v: str) -> str:
        """Validate time format HH:MM and valid hours/minutes."""
        if not isinstance(v, str) or len(v) != 5 or v[2] != ":":
            raise ValueError("Time must be in HH:MM format (e.g., 10:30)")
        try:
            h, m = map(int, v.split(":"))
            if not (0 <= h < 24 and 0 <= m < 60):
                raise ValueError("Invalid time values")
        except (ValueError, IndexError) as e:
            raise ValueError("Invalid time format") from e
        return v


class ShiftTypeCreate(BaseModel):
    """Create shift type request."""

    name: str
    time_windows: list[TimeWindow]
    uses_dynamic_close: bool = False
    expected_hours: float
    description: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate shift type name."""
        if not v or len(v) > 100:
            raise ValueError("Name must be 1-100 characters")
        return v

    @field_validator("expected_hours")
    @classmethod
    def validate_expected_hours(cls, v: float) -> float:
        """Validate expected hours range."""
        if not (0.5 <= v <= 24.0):
            raise ValueError("Expected hours must be between 0.5 and 24.0")
        return v


class ShiftTypeUpdate(BaseModel):
    """Update shift type request."""

    name: str | None = None
    time_windows: list[TimeWindow] | None = None
    uses_dynamic_close: bool | None = None
    expected_hours: float | None = None
    description: str | None = None


class ShiftTypeResponse(BaseModel):
    """Shift type response."""

    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    time_windows: list[dict[str, str]]
    uses_dynamic_close: bool
    expected_hours: float
    total_hours: float
    description: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
