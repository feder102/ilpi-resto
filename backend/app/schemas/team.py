"""T062: Team Pydantic DTOs with shift type integration."""

import uuid

from pydantic import BaseModel


class TimeWindowResponse(BaseModel):
    """Time window from shift type."""

    start: str
    end: str


class ShiftTypeDetail(BaseModel):
    """Shift type details for team response."""

    id: uuid.UUID
    name: str
    type: str
    time_windows: list[dict] | list[TimeWindowResponse]
    expected_hours: float
    total_hours: float
    uses_dynamic_close: bool
    description: str | None = None


class TeamCreate(BaseModel):
    """Create team with shift type reference."""

    name: str
    department: str
    shift_type_id: uuid.UUID  # FK to ShiftType


class TeamUpdate(BaseModel):
    """Update team fields (shift_type_id optional for changes)."""

    name: str | None = None
    department: str | None = None
    shift_type_id: uuid.UUID | None = None


class TeamMemberItem(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    profile_image: str | None


class TeamResponse(BaseModel):
    """Team response with shift type details."""

    id: uuid.UUID
    name: str
    department: str
    shift_type_id: uuid.UUID
    # Shift type details
    shift_type: ShiftTypeDetail | None = None
    time_windows: list[dict] | None = None
    total_hours: float | None = None
    expected_hours: float | None = None
    uses_dynamic_close: bool | None = None
    # Team metadata
    is_active: bool
    members: list[TeamMemberItem] = []


class TeamMemberAdd(BaseModel):
    employee_id: uuid.UUID
