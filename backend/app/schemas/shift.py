"""T063: Shift Pydantic DTOs."""

import uuid
from datetime import date

from pydantic import BaseModel


class ClockInRequest(BaseModel):
    employee_id: uuid.UUID
    location_lat: float | None = None
    location_lng: float | None = None
    task_label: str | None = None


class ClockOutRequest(BaseModel):
    location_lat: float | None = None
    location_lng: float | None = None


class ShiftRecordResponse(BaseModel):
    id: uuid.UUID
    employee_id: uuid.UUID
    employee_name: str | None = None
    employee_image: str | None = None
    date: date
    entry_time: str
    exit_time: str | None
    location_lat: float | None
    location_lng: float | None
    task_label: str | None
