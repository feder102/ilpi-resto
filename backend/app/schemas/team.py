"""T062: Team Pydantic DTOs."""

import uuid

from pydantic import BaseModel


class TeamCreate(BaseModel):
    name: str
    department: str
    shift_type: str
    shift_start: str
    shift_end: str


class TeamUpdate(BaseModel):
    name: str | None = None
    department: str | None = None
    shift_type: str | None = None
    shift_start: str | None = None
    shift_end: str | None = None


class TeamMemberItem(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    profile_image: str | None


class TeamResponse(BaseModel):
    id: uuid.UUID
    name: str
    department: str
    shift_type: str
    shift_start: str
    shift_end: str
    is_active: bool
    members: list[TeamMemberItem] = []


class TeamMemberAdd(BaseModel):
    employee_id: uuid.UUID
