"""T053: Vacation Pydantic DTOs."""

import uuid
from datetime import date

from pydantic import BaseModel, field_validator


class VacationRequestCreate(BaseModel):
    """Admin/Moderador request - requires specifying employee"""
    employee_id: uuid.UUID
    start_date: date
    end_date: date

    @field_validator("end_date")
    @classmethod
    def end_after_start(cls, v: date, info) -> date:
        start = info.data.get("start_date")
        if start and v < start:
            raise ValueError("La fecha de fin debe ser posterior a la de inicio")
        return v


class VacationRequestCreateEmployee(BaseModel):
    """Employee request - no employee_id (uses authenticated user)"""
    start_date: date
    end_date: date

    @field_validator("end_date")
    @classmethod
    def end_after_start(cls, v: date, info) -> date:
        start = info.data.get("start_date")
        if start and v < start:
            raise ValueError("La fecha de fin debe ser posterior a la de inicio")
        return v


class VacationActionRequest(BaseModel):
    version: int


class VacationRequestResponse(BaseModel):
    id: uuid.UUID
    employee_id: uuid.UUID
    employee_name: str | None = None
    employee_image: str | None = None
    employee_department: str | None = None
    start_date: date
    end_date: date
    requested_days: int
    status: str
    reviewed_by: uuid.UUID | None
    reviewed_at: str | None
    version: int
    created_at: str


class VacationBalanceResponse(BaseModel):
    employee_id: uuid.UUID
    year: int
    total_days: int
    used_days: int
    remaining_days: int
